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

import events from './data/martha-events.json';
import employeesData from './data/martha-characters.json';

import StorylineChart, {SvenLayout} from '../../src';

import './App.css';

const layout = SvenLayout()
  .time(d => parseInt(d.date))
  .id(d => d.name)
  .group(d => d.name);

const color = scaleOrdinal(schemeCategory10);

const employees = Map(employeesData);

const employeesByType = Map().withMutations(map =>
  employees.map((v,k) => map.setIn([v,k], true))
);

const CharacterList = ({data, onClick}) =>
  <List>
    { data.keySeq().sort().map(k =>
        <ListItem button dense key={k} onClick={e => onClick(k, data.get(k), e.shiftKey)}>
          <Avatar style={{backgroundColor: color(k)}}>
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
          Year {k}
        </div>
      )
    }
  </div>

// Include only the specific years that have events
const marthaAllowedYears = ['1920', '1985', '1986', '2019', '2040', '2052'];
const dates = Map(marthaAllowedYears.map(year => [year, false]));

class App extends Component {
  state = {
    people: employees.map(() => false),
    dates: dates.map(() => true) // Select all years by default
  };

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
            <CardHeader title='Timeline Years' subheader='click to include data from specific years (1920, 1985, 1986, 2019, 2040, 2052)'/>
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
            <StorylineChart
              xAxisData={marthaAllowedYears}
              data={storylines}
              height={Math.max(10*(ymax - ymin), 50)}
              color={d => color(d.key)}
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