/* 

  BSD License:

  SVEN: Storyline Visualization Library and Demonstration

  Copyright ©️ 2017, Battelle Memorial Institute
  All rights reserved.

  1. Battelle Memorial Institute (hereinafter Battelle) hereby grants permission
     to any person or entity lawfully obtaining a copy of this software and
     associated documentation files (hereinafter “the Software”) to redistribute
     and use the Software in source and binary forms, with or without 
     modification.  Such person or entity may use, copy, modify, merge, publish,
     distribute, sublicense, and/or sell copies of the Software, and may permit
     others to do so, subject to the following conditions:

     * Redistributions of source code must retain the above copyright notice,
       this list of conditions and the following disclaimers.
     * Redistributions in binary form must reproduce the above copyright notice,
       this list of conditions and the following disclaimer in the documentation
       and/or other materials provided with the distribution.
     * Other than as used herein, neither the name Battelle Memorial Institute
       or Battelle may be used in any form whatsoever without the express
       written consent of Battelle. 

  2. THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
     AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO,
     THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR
     PURPOSEARE DISCLAIMED. IN NO EVENT SHALL BATTELLE OR CONTRIBUTORS BE LIABLE
     FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
     DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
     SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
     CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT
     LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY
     OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH
     DAMAGE.
     
*/

import React from 'react';
import {Set} from 'immutable';

import ChartComponent from './ReactD3Chart';

import './Storyline.css';

import {scaleLinear} from 'd3-scale';
import {min, max, merge} from 'd3-array';
import {line, curveMonotoneX} from 'd3-shape';
import {axisBottom} from 'd3-axis';

const storylinesInit = ({data={}, width, height, groupLabel, xAxisData: providedXAxisData}) => {
  let {interactions=[], events=[]} = data;

  if (interactions.length === 0) {
    return {layers: []};
  } else {
    // Use provided xAxisData (from props) if available, else derive from events
    let xAxisData = providedXAxisData && providedXAxisData.length
      ? providedXAxisData.map(d => +d)
      : Set(events.map(d => +d.x)).sort().toArray();

    // Initial (max) padding guess based on overall width
    let basePadding = width/xAxisData.length/3;

    const minYear = Math.min.apply(null, xAxisData);
    const maxYear = Math.max.apply(null, xAxisData);

    const x = scaleLinear()
      .domain([minYear, maxYear])
      .range([basePadding, width - basePadding]);

    // Recalculate padding so that for any consecutive x positions we guarantee
    // (x_i + padding) <= (x_{i+1} - padding). This prevents the generated point
    // sequence (x_i - padding, x_i + padding, x_{i+1} - padding ...) from ever
    // decreasing in x which caused curves to "bend back" visually.
    if (xAxisData.length > 1) {
      let minGap = Infinity;
      for (let i = 1; i < xAxisData.length; i++) {
        const gap = x(xAxisData[i]) - x(xAxisData[i-1]);
        if (gap < minGap) minGap = gap;
      }
      // Safe padding: at most half the smallest gap (minus 1 pixel) and no larger than basePadding
      const safePadding = Math.max(0, Math.min(basePadding, (minGap/2) - 1));
      if (safePadding !== basePadding) {
        // Update scale range to use the new (possibly smaller) padding
        x.range([safePadding, width - safePadding]);
        basePadding = safePadding;
      }
    }

    const padding = basePadding;

    const ymax = max(interactions, d => d.y1);
    const ymin = min(interactions, d => d.y0);

    const actualHeight = Math.min(height, (ymax - ymin)*20);

    const y = scaleLinear()
      .domain([ymin, ymax])
      .range([actualHeight - height, -height]);

    const yAxisData = interactions.map(({values, y0, y1}) => ({
      group: groupLabel && groupLabel(values[0].values[0].data),
      values: merge(values.map(d => d.values.map(d => d.data))),
      y: (y0 + y1)/2,
      y0, y1
    }));

    return {x, y, xAxisData, yAxisData, padding};
  }
};

const storylineLayers = [
  {
    name: 'groups',
    callback: (selection, {yAxisData, width, y, onClick=Object}) => {
      const groups = selection.selectAll('rect')
          .data(yAxisData, d => d.group);

      groups.enter()
        .append('rect')
        .on('click', d => onClick(d.values))
        .merge(groups)
          .attr('x', 0)
          .attr('width', width)
          .attr('y', d => y(d.y1))
          .attr('height', d => Math.abs(y(d.y1) - y(d.y0)));

      groups.exit()
        .remove();

      const labels = selection.selectAll('text')
        .data(yAxisData, d => d.group);

      labels.enter()
        .append('text')
        .merge(labels)
          .attr('x', 0)
          .attr('y', d => y(d.y1))
          .text(d => d.group);

      labels.exit()
        .remove();
    }
  },
  {
    name: 'storylines',
    callback: (selection, {data, x, y, color, padding, highlights, onClick, lineLabel, lineTitle}) => {
      onClick = onClick || (() => {});
      const storyline = line()
        .curve(curveMonotoneX);

      function getPoints (d) {
        const pts = [];
        const vals = d.values;
        const n = vals.length;
        const eps = 0.25;
        for (let i=0; i<n; i++) {
          const cur = vals[i];
          const xCur = x(cur.x);
          const yCur = y(cur.y);
          const xLeft = xCur - padding;
          let xRight = xCur + padding;
          if (i < n - 1) {
            const nxt = vals[i+1];
            const xNext = x(nxt.x);
            // Maximum allowed right extension so we don't intrude into next event's left padding
            const maxRight = xNext - padding - eps;
            if (xRight > maxRight) {
              // Clamp to either maxRight or midpoint (whichever is smaller) for smoother shape
              const mid = (xCur + xNext)/2 - eps;
              xRight = Math.min(maxRight, mid);
            }
          }
          // Ensure monotonicity vs previous appended point
            if (pts.length) {
              const lastX = pts[pts.length - 1][0];
              if (xLeft <= lastX) {
                // shift slightly forward
                const shift = lastX + eps;
                // keep symmetry if possible
                const delta = (xRight - xLeft);
                const newLeft = shift;
                let newRight = newLeft + delta;
                if (i < n - 1) {
                  // Re-apply clamping for newRight
                  const nxt = vals[i+1];
                  const xNext = x(nxt.x);
                  const maxRight2 = xNext - padding - eps;
                  if (newRight > maxRight2) newRight = maxRight2;
                }
                pts.push([newLeft, yCur]);
                pts.push([Math.max(newRight, newLeft + eps), yCur]);
                continue;
              }
            }
          pts.push([xLeft, yCur]);
          pts.push([Math.max(xRight, xLeft + eps), yCur]);
        }
        return pts;
      }

      const paths = selection.selectAll('g')
        .data(data.storylines, d => d.key);

      const paths_enter = paths.enter()
        .append('g')
          .on('click', d => onClick(d.values.map(d => d.data)));

      paths_enter.append('path');
      paths_enter.append('text');
      paths_enter.append('title')

      const paths_merge = paths_enter.merge(paths)
        .classed('highlighted', d => highlights && highlights.has(d.key));

      paths_merge.select('title')
        .text(lineTitle);

      paths_merge.select('path')
        .style('stroke', d => color && color(d))
        .attr('d', d => storyline(getPoints(d)));

      paths_merge.select('text')
        .style('fill', d => color && color(d))
        .text(d => lineLabel ? lineLabel(d) : d.key)
        .attr('text-anchor', 'end')
        .attr('x', 0)
        .attr('y', d => y(d.values[0].y));

      paths.exit()
        .remove();
    }
  },
  {
    name: 'x-axis',
    callback: (selection, {x, xAxisData}) => {
      selection.call(axisBottom(x)
        .tickValues(xAxisData)
        .tickFormat(d => d));
    }
  }      
];

const StorylineChart = props =>
  <ChartComponent
    init={storylinesInit}
    layers={storylineLayers}
    {...props}
    margin={{top: 30, right: 20, bottom: 25, left: 135}}
    className='storylines-chart'
  />;

export default StorylineChart;