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

import {scaleLinear, scalePoint} from 'd3-scale';
import {min, max, merge} from 'd3-array';
import {line, curveMonotoneX} from 'd3-shape';
import {axisBottom} from 'd3-axis';

/**
 * Calculate minimum spacing needed to prevent overlapping labels
 * @param {Array} years - Array of year values
 * @param {Function} xScale - D3 scale function
 * @returns {number} - Minimum spacing needed in pixels
 */
function calculateMinimumSpacing(years, xScale) {
  if (years.length <= 1) return 0;
  
  // Calculate current spacing between consecutive years
  const spacings = [];
  for (let i = 1; i < years.length; i++) {
    const currentX = xScale(years[i]);
    const prevX = xScale(years[i - 1]);
    spacings.push(currentX - prevX);
  }
  
  // Find the minimum spacing
  const minCurrentSpacing = Math.min(...spacings);
  
  // We need at least 60px between labels to prevent overlap
  const requiredSpacing = 60;
  
  // If current spacing is already sufficient, return 0
  if (minCurrentSpacing >= requiredSpacing) {
    return 0;
  }
  
  // Calculate how much extra spacing we need
  return requiredSpacing - minCurrentSpacing;
}

const storylinesInit = ({data={}, width, height, groupLabel, xAxisData: providedXAxisData}) => {
  let {interactions=[], events=[]} = data;

  if (interactions.length === 0) {
    return {layers: []};
  } else {
    // Use provided xAxisData (from props) if available, else derive from events
    let xAxisData = providedXAxisData && providedXAxisData.length
      ? providedXAxisData.map(d => +d)
      : Set(events.map(d => +d.x)).sort().toArray();

    // Use original width without extra spacing to fit on screen
    const adjustedWidth = width;

    // Initial (max) padding guess based on adjusted width - maximum spacing for clear events
    let basePadding = adjustedWidth/xAxisData.length/0.5;

    const minYear = Math.min.apply(null, xAxisData);
    const maxYear = Math.max.apply(null, xAxisData);

    // Create custom spacing: more space for consecutive years, less for big gaps
    const yearGaps = [];
    for (let i = 1; i < xAxisData.length; i++) {
      yearGaps.push(parseInt(xAxisData[i]) - parseInt(xAxisData[i-1]));
    }
    
    // Calculate custom positions based on gaps
    const customPositions = [0]; // Start at 0
    let currentPos = 0;
    
    for (let i = 0; i < yearGaps.length; i++) {
      const gap = yearGaps[i];
      let spacing;
      
      if (gap <= 2) {
        // Consecutive years or small gaps: more spacing
        spacing = adjustedWidth / xAxisData.length * 0.8;
      } else if (gap <= 10) {
        // Medium gaps: moderate spacing
        spacing = adjustedWidth / xAxisData.length * 0.4;
      } else {
        // Large gaps: less spacing
        spacing = adjustedWidth / xAxisData.length * 0.2;
      }
      
      currentPos += spacing;
      customPositions.push(currentPos);
    }
    
    // Scale the positions to fit the full width
    const maxPos = Math.max(...customPositions);
    const scaledPositions = customPositions.map(pos => 
      basePadding + (pos / maxPos) * (adjustedWidth - 2 * basePadding)
    );
    
    // Create custom scale
    const x = scalePoint()
      .domain(xAxisData)
      .range(scaledPositions);

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
        x.range([safePadding, adjustedWidth - safePadding]);
        basePadding = safePadding;
      }
    }

    const padding = basePadding;

    const ymax = max(interactions, d => d.y1);
    const ymin = min(interactions, d => d.y0);

    const actualHeight = Math.min(height, (ymax - ymin)*20);

    // Force y-scale to match our exact order
    const y = scaleLinear()
      .domain([0, (interactions.length - 1) * 200]) // Fixed domain based on our order
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
      // paths_enter.append('text'); // Removed character names
      paths_enter.append('title')

      const paths_merge = paths_enter.merge(paths)
        .classed('highlighted', d => highlights && highlights.has(d.key));

      paths_merge.select('title')
        .text(lineTitle);

      paths_merge.select('path')
        .style('stroke', d => color && color(d))
        .attr('d', d => storyline(getPoints(d)));

      // Removed character name text labels
      // paths_merge.select('text')
      //   .style('fill', d => color && color(d))
      //   .text(d => lineLabel ? lineLabel(d) : d.key)
      //   .attr('x', d => x(d.values[0].x) - padding - 200)
      //   .attr('y', d => y(d.values[0].y) + 25)
      //   .style('text-anchor', 'end')
      //   .style('dominant-baseline', 'middle')
      //   .style('font-size', '14px')
      //   .style('font-weight', 'bold')
      //   .style('text-shadow', '1px 1px 2px rgba(255,255,255,0.😎');

      paths.exit()
        .remove();
    }
  },
  {
    name: 'x-axis',
    callback: (selection, {x, xAxisData}) => {
      // Calculate extra spacing needed to prevent overlapping
      const extraSpacing = calculateMinimumSpacing(xAxisData, x);
      
      console.log('Rendering axis with years:', xAxisData);
      console.log('Axis domain:', x.domain());
      console.log('Axis range:', x.range());
      
      // Create custom axis with all years
      const axis = axisBottom(x)
        .tickValues(xAxisData)
        .tickFormat(d => d)
        .tickSize(2)
        .tickPadding(2);
      
      selection.call(axis);
      
      // Customize the tick labels to prevent overlapping
      selection.selectAll('.tick text')
        .style('text-anchor', 'end')
        .attr('dx', '-0.3em')
        .attr('dy', '0.3em')
        .attr('transform', 'rotate(-45)')
        .style('font-size', '8px')
        .style('font-family', 'Arial, sans-serif')
        .style('font-weight', 'bold');
      
      // Adjust the axis position to accommodate rotated labels
      selection.attr('transform', 'translate(0, 20)');
      
      // Log the actual tick elements created
      const tickElements = selection.selectAll('.tick');
      console.log('Number of tick elements created:', tickElements.size());
    }
  }      
];

const StorylineChart = props =>
  <ChartComponent
    init={storylinesInit}
    layers={storylineLayers}
    {...props}
    margin={{top: 15, right: 80, bottom: 40, left: 10}}
    className='storylines-chart'
  />;

export default StorylineChart;