/* 

  BSD License:

  SVEN: Storyline Visualization Library and Demonstration

  Copyright © 2017, Battelle Memorial Institute
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
import marthaEvents from '../demo/src/data/martha-events.json';
import marthaCharacters from '../demo/src/data/martha-characters.json';

const storylinesInit = ({ data = marthaEvents, width, height, groupLabel }) => {
  const xAxisData = Array.from(new Set(data.map((d) => +d.date))).sort();

  const padding = width / xAxisData.length / 3;

  const x = scaleLinear()
    .domain([1920, 2052]) // Updated domain to include the full range of years
    .range([padding, width - padding]);

  const ymax = max(data, (d) => d.y1 || 0);
  const ymin = min(data, (d) => d.y0 || 0);

  const actualHeight = Math.min(height, (ymax - ymin) * 20);

  const y = scaleLinear()
    .domain([ymin, ymax])
    .range([actualHeight - height, -height]);

  const yAxisData = data.map(({ name, date, description, death }) => ({
    group: groupLabel && groupLabel(name),
    values: [{ x: +date, y: death ? 1 : 0, data: description }],
    y: death ? 1 : 0,
    y0: 0,
    y1: death ? 1 : 0,
  }));

  return { x, y, xAxisData, yAxisData, padding };
};

const storylineLayers = [
  {
    name: 'groups',
    callback: (selection, { yAxisData, width, y, onClick = Object }) => {
      const groups = selection.selectAll('rect').data(yAxisData, (d) => d.group);

      groups
        .enter()
        .append('rect')
        .on('click', (d) => onClick(d.values))
        .merge(groups)
        .attr('x', 0)
        .attr('width', width)
        .attr('y', (d) => y(d.y1))
        .attr('height', (d) => Math.abs(y(d.y1) - y(d.y0)));

      groups.exit().remove();

      const labels = selection.selectAll('text').data(yAxisData, (d) => d.group);

      labels
        .enter()
        .append('text')
        .merge(labels)
        .attr('x', 0)
        .attr('y', (d) => y(d.y1))
        .text((d) => d.group);

      labels.exit().remove();
    },
  },
  {
    name: 'storylines',
    callback: (selection, { data, x, y, color, padding, highlights, onClick = Object, lineLabel, lineTitle }) => {
      const storyline = line().curve(curveMonotoneX);

      function getPoints(d) {
        return d.values.map((v) => [x(v.x), y(v.y)]);
      }

      const paths = selection.selectAll('g').data(data.storylines, (d) => d.key);

      const pathsEnter = paths.enter().append('g').on('click', (d) => onClick(d.values.map((d) => d.data)));

      pathsEnter.append('path');
      pathsEnter.append('text');
      pathsEnter.append('title');

      const pathsMerge = pathsEnter.merge(paths).classed('highlighted', (d) => highlights && highlights.has(d.key));

      pathsMerge.select('title').text(lineTitle);

      pathsMerge
        .select('path')
        .style('stroke', (d) => color && color(d))
        .attr('d', (d) => storyline(getPoints(d)));

      pathsMerge
        .select('text')
        .style('fill', (d) => color && color(d))
        .text((d) => (lineLabel ? lineLabel(d) : d.key))
        .attr('x', (d) => x(d.values[d.values.length - 1].x) + padding)
        .attr('y', (d) => y(d.values[d.values.length - 1].y));

      paths.exit().remove();
    },
  },
  {
    name: 'x-axis',
    callback: (selection, { data, x }) => {
      selection.call(
        axisBottom(x)
          .tickValues([1920, 1986, 2019, 2052])
          .tickFormat((d) => 'Year ' + d)
      );
    },
  },
];

const StorylineChart = (props) => (
  <ChartComponent
    init={storylinesInit}
    layers={storylineLayers}
    {...props}
    margin={{ top: 30, right: 135, bottom: 25, left: 20 }}
    className="storylines-chart"
  />
);

export default StorylineChart;
