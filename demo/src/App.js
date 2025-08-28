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

import React, { Component } from 'react';

import {Map, Set} from 'immutable';

import {scaleOrdinal, schemeCategory10} from 'd3-scale';
import {min, max} from 'd3-array';

import moment from 'moment';

import Typography from '@material-ui/core/Typography';
import Avatar from '@material-ui/core/Avatar';
import Grid from '@material-ui/core/Grid';
import Paper from '@material-ui/core/Paper';
import List from '@material-ui/core/List';
import ListSubheader from '@material-ui/core/ListSubheader';
import ListItem from '@material-ui/core/ListItem';
import ListItemText from '@material-ui/core/ListItemText';
import Checkbox from '@material-ui/core/Checkbox';
import Card from '@material-ui/core/Card';
import CardHeader from '@material-ui/core/CardHeader';
import CardContent from '@material-ui/core/CardContent';

import Select from 'react-select-2';
import 'react-select-2/dist/css/react-select-2.css';

import events from './data/origin-events.json';
import employeesData from './data/origin-characters.json';

import StorylineChart, {SvenLayout} from '../../src';

import './App.css';

const layout = SvenLayout()
  .time(d => parseInt(d.date))
  .id(d => d.name)
  .group(d => d.name);

const color = scaleOrdinal(schemeCategory10);

// Family-based color key helper: same family (last name) shares a color
const familyColorKey = key => {
  // Take first segment before slash (alias separator)
  let base = key.split(' / ')[0];
  // Remove parenthetical qualifiers
  base = base.replace(/\(.*?\)/g, '').trim();
  const parts = base.split(/\s+/);
  return parts[parts.length - 1];
};
const familyColorScale = scaleOrdinal(schemeCategory10);

// --- Per-character color variant helpers ---
// Simple deterministic hash for strings
const hashCode = (str = '') => {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) - h) + str.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
};

// Convert hex color to HSL
const hexToHsl = (hex) => {
  // Expand shorthand like #abc
  const full = hex.replace(/^#?([a-f\d])([a-f\d])([a-f\d])$/i, (m, r, g, b) => '#' + r + r + g + g + b + b);
  const res = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(full);
  if (!res) return {h: 0, s: 0, l: 0};
  let r = parseInt(res[1], 16) / 255;
  let g = parseInt(res[2], 16) / 255;
  let b = parseInt(res[3], 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h, s, l = (max + min) / 2;
  if (max === min) {
    h = s = 0; // achromatic
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
      default: h = 0;
    }
    h /= 6;
  }
  return {h: h * 360, s: s * 100, l: l * 100};
};

const clamp = (v, minV, maxV) => Math.max(minV, Math.min(maxV, v));

// Given a base family color and a character name, return a slightly varied HSL color string
const characterVariantColor = (baseHex, name) => {
  const {h, s, l} = hexToHsl(baseHex);
  const hsh = hashCode(name);
  // small deterministic offsets
  const dh = ((hsh % 21) - 10) * 1.5;    // -15..+15 degrees
  const dl = ((Math.floor(hsh / 13) % 11) - 5) * 1.0; // -5..+5 lightness
  const ds = ((Math.floor(hsh / 29) % 9) - 4) * 1.0;  // -4..+4 saturation
  const nh = (h + dh + 360) % 360;
  const nl = clamp(l + dl, 25, 80);
  const ns = clamp(s + ds, 35, 95);
  return `hsl(${Math.round(nh)}, ${Math.round(ns)}%, ${Math.round(nl)}%)`;
};

const characterColor = (name) => {
  const base = familyColorScale(familyColorKey(name));
  return characterVariantColor(base, name);
};
// --- end color helpers ---

const employees = Map(employeesData);

const employeesByType = Map().withMutations(map =>
  employees.map((v,k) => map.setIn([v,k], true))
);

const CharacterList = ({data, onClick}) =>
  <List>
    { data.keySeq().sort().map(k =>
        <ListItem button dense key={k} onClick={e => onClick(k, data.get(k), e.shiftKey)}>
          <Avatar style={{backgroundColor: characterColor(k)}}>
            {data.get(k).size}
          </Avatar>
          <ListItemText primary={k}/>
        </ListItem>
      )
    }
  </List>

const asSelectList = map =>
  map.keySeq()
    .sort()
    .map(value => ({value, label: value}))
    .toArray();

const DELIIMTER = ';';

const CharacterSelect = ({data, onChange}) =>
  <Select simpleValue multi delimiter={DELIIMTER}
    options={asSelectList(data.filter(v => !v))}
    value={asSelectList(data.filter(v => v))}
    onChange={onChange}
  />

const DatesSelect = ({data, onChange}) =>
  <div className='dates-component noselect'>
    { data.keySeq().sort().map(k =>
        <div
          key={k}
          onClick={e => onChange(k, !data.get(k), e.shiftKey)}
          className={'date' + (data.get(k) ? ' selected' : '')}
        >
          {k}
        </div>
      )
    }
  </div>

// Include only the specific years that have events
const specificYears = ['1971', '1976', '1986'];
const dates = Map(specificYears.map(year => [year, false]));

class App extends Component {
  state = {
    people: employees.map(() => false),
    dates: dates.map(() => true) // Select all years by default
  };

  // --- SVG export helpers ---
  inlineStyles = (svg) => {
    const original = document.querySelector('svg.storylines-chart');
    if (!original) return;
    const getSourceElement = el => {
      if (svg === original) return el;
      if (!this._origElements) {
        this._origElements = Array.from(original.querySelectorAll('*'));
        this._cloneElements = Array.from(svg.querySelectorAll('*'));
      }
      const idx = this._cloneElements.indexOf(el);
      return this._origElements[idx] || el;
    };
    const PROPS = ['fill','fill-opacity','stroke','stroke-width','stroke-opacity','font','font-size','font-family','font-weight','opacity','stroke-linecap','stroke-linejoin','stroke-dasharray'];
    svg.querySelectorAll('*').forEach(el => {
      const source = getSourceElement(el);
      const cs = window.getComputedStyle(source);
      const decls = [];
      PROPS.forEach(p => {
        const val = cs.getPropertyValue(p);
        if (!val || val === 'initial') return;
        decls.push(`${p}:${val.trim()}`);
        if (p === 'fill') el.setAttribute('fill', val.trim());
        if (p === 'stroke') el.setAttribute('stroke', val.trim());
      });
      if (decls.length) el.setAttribute('style', decls.join(';')); else el.removeAttribute('style');
    });
  }

  handleDownloadSVG = () => {
    const svg = document.querySelector('svg.storylines-chart');
    if (!svg) return;
    const clone = svg.cloneNode(true);
    if (!clone.getAttribute('xmlns')) clone.setAttribute('xmlns','http://www.w3.org/2000/svg');
    const bb = svg.getBBox();
    if (!clone.getAttribute('viewBox')) clone.setAttribute('viewBox', `${bb.x} ${bb.y} ${bb.width} ${bb.height}`);
    this.inlineStyles(clone);
    const blob = new Blob([clone.outerHTML], {type:'image/svg+xml;charset=utf-8'});
    const a = document.createElement('a');
    a.download = 'storylines.svg';
    a.href = URL.createObjectURL(blob);
    document.body.appendChild(a);
    a.click();
    URL.revokeObjectURL(a.href);
    a.remove();
  }
  // --- end export helpers ---

  handleCharacterTypeClick = (k, v, append) => {
    if (append) {
      this.setState({people: this.state.people.merge(v)});
    } else {
      this.setState({people: this.state.people.map((_,k) => v.has(k))});
    }
  }

  handleCharacterChange = value => {
    const selection =  Set(value.split(DELIIMTER));
    this.setState({
      people: this.state.people.map((_,k) => selection.has(k))
    });
  }

  handleCharacterClick = values => {
    const selection = Set(values.map(d => d.name));
    this.setState({
      people: this.state.people.map((v, k) => selection.has(k))
    });
  }

  handleDateChage = (k, v, append) => {
    this.setState({
      dates: append
        ? this.state.dates.set(k, v)
        : this.state.dates.map((_,k2) => k === k2)
    });
  }

  render() {
    const {people, dates} = this.state;

    const nFiltered = people.valueSeq()
      .reduce((v, sum) => v + sum, 0);

    const data = events
      .filter(d => nFiltered === 0 || people.get(d.name))
      .filter(d => dates.get(d.date));

    // Use all characters from origin-characters.json
    const allCharacters = Object.keys(employeesData);
    // Get all years from the data
    const allYears = Array.from(new Set(events.map(d => d.date)));
    // Ensure each character has a data point for every year
    const filledData = [];
    allCharacters.forEach(name => {
      allYears.forEach(date => {
        const event = data.find(d => d.name === name && d.date === date);
        if (event) {
          filledData.push(event);
        } else {
          filledData.push({
            name,
            date,
            activity: '',
            description: '',
            important: false,
            death: false
          });
        }
      });
    });

    // Preprocess: for each year, if multiple characters share the same non-empty activity, set group to activity name; else group by character name
    const activityByYear = {};
    allYears.forEach(year => {
      activityByYear[year] = {};
      allCharacters.forEach(name => {
        const ev = filledData.find(d => d.name === name && d.date === year);
        activityByYear[year][name] = ev ? ev.activity : '';
      });
    });
    // Assign default y positions
    const yPositions = {};
    allCharacters.forEach((name, i) => {
      yPositions[name] = i;
    });
    // For each year, if multiple characters share the same activity, set their y to midpoint
    const customY = {};
    allYears.forEach(year => {
      const activityCounts = {};
      allCharacters.forEach(name => {
        const act = activityByYear[year][name];
        if (act) {
          if (!activityCounts[act]) activityCounts[act] = [];
          activityCounts[act].push(name);
        }
      });
      Object.keys(activityByYear[year]).forEach(name => {
        let y;
        const act = activityByYear[year][name];
        if (act && activityCounts[act] && activityCounts[act].length > 1) {
          // Set all to the midpoint of their default y's
          const indices = activityCounts[act].map(n => yPositions[n]);
          const mid = indices.reduce((a, b) => a + b, 0) / indices.length;
          y = mid;
        } else {
          y = yPositions[name];
        }
        if (!customY[year]) customY[year] = {};
        customY[year][name] = y;
      });
    });
    filledData.forEach(d => {
      d._customY = customY[d.date][d.name];
    });

    // Use custom group accessor (for color/label)
    const storylines = layout
      .group(d => {
        const activity = d.activity;
        if (activity) {
          const charsWithActivity = allCharacters.filter(name => activityByYear[d.date][name] === activity);
          if (charsWithActivity.length > 1) {
            return activity + ' Group';
          } else {
            return d.name;
          }
        } else {
          return d.name;
        }
      })
      (filledData);
    const ymin = min(storylines.interactions, d => d.y0);
    const ymax = max(storylines.interactions, d => d.y1);
    
    return (
      <Grid container>
        <Grid item xs={12} sm={3}>
          <Card>
            <CardHeader title='Timeline Years' subheader='click to include data from specific years (1971, 1976, 1986)'/>
            <CardContent>
              <DatesSelect data={this.state.dates} onChange={this.handleDateChage}/>
            </CardContent>
          </Card>            

          <Card>
            <CardHeader title='Character Categories' subheader='click to add character types to filter'/>
            <CardContent>
              <CharacterList data={employeesByType} onClick={this.handleCharacterTypeClick}/>
            </CardContent>
          </Card>

          <Card>
            <CardHeader title='Filter by Character' subheader='show specific characters only'/>
            <CardContent>
              <CharacterSelect data={people} onChange={this.handleCharacterChange}/>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={9}>
          <Paper>
            <div style={{display:'flex', justifyContent:'flex-end', padding:'8px'}}>
              <button onClick={this.handleDownloadSVG}>Download SVG</button>
            </div>
            <StorylineChart
              xAxisData={['1971', '1976', '1986']}
              data={storylines}
              height={Math.max(10*(ymax - ymin), 50)}
              color={d => characterColor(d.key)}
              lineLabel={d => d.key}
              lineTitle={d => d.key}
              groupLabel={d => d.key}
              onClick={this.handleCharacterClick}
            />
          </Paper>
        </Grid>

      </Grid>
    );
	}
}

export default App;