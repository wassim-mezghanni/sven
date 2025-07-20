/* 

  BSD License:

  SVEN: Storyline Visualization Library and Demonstration

  Copyright ©️ 2017, Battelle Memorial Institute
  All rights reserved.

  1. Battelle Memorial Institute (hereinafter Battelle) hereby grants permission
     to any person or entity lawfully obtaining a copy of this software and
     associated documentation files (hereinafter "the Software") to redistribute
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

import eventsRaw from './data/martha-events.json';
import employeesData from './data/martha-characters.json';
import jonasEventsRaw from './data/jonas-events.json';
import jonasCharactersData from './data/jonas-characters.json';

import StorylineChart, {SvenLayout} from '../../src';

import './App.css';

// Helper function to extract year from date string
const extractYear = (dateStr) => {
  if (dateStr.includes('-')) {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return parts[2]; // Get year from "DD-MM-YYYY" or "MM-DD-YYYY"
    } else if (parts.length === 2) {
      return parts[1]; // Get year from "MM-YYYY" (if exists)
    }
  } else {
    return dateStr; // Already just year "YYYY"
  }
};

// Only keep events with allowed years
const allowedYears = ['1920', '1985', '1986', '2019', '2040', '2052'];
const events = eventsRaw.filter(d => allowedYears.includes(d.date.split('-')[2]));

// After filtering events, ensure all characters are included
const allNames = Object.keys(employeesData);
const allEvents = [...events];
allowedYears.forEach(year => {
  allNames.forEach(name => {
    // If this character has no event in this year, add a placeholder
    if (!events.some(e => e.name === name && e.date.split('-')[2] === year)) {
      allEvents.push({
        date: `01-01-${year}`,
        name,
        activity: 'None',
        description: '',
        important: false,
        death: false
      });
    }
  });
});

const specificYears = allowedYears;
const dates = Map(specificYears.map(year => [year, true]));

// Extract unique years from Jonas data for allowed years
const jonasAllowedYears = ['1888', '1890', '1904', '1910', '1911', '1920', '1921', '1953', '1954', '1971', '1986', '1987', '2019', '2020', '2021', '2023', '2040', '2041', '2052', '2053'];

// Create jonasDates Map differently to ensure it works
const jonasDatesEntries = jonasAllowedYears.map(year => [String(year), true]);
const jonasDatesMap = Map(jonasDatesEntries);

const jonasEvents = jonasEventsRaw.filter(d => jonasAllowedYears.includes(extractYear(d.date)));

// Create separate layout for Jonas data
const jonasLayout = SvenLayout()
  .time(d => parseInt(extractYear(d.date)))
  .id(d => String([d.name, d.date]))
  .group(d => d.activity);

const color = scaleOrdinal(schemeCategory10);

const employees = Map(employeesData);

const employeesByType = Map().withMutations(map =>
  employees.map((v,k) => map.setIn([v,k], true))
);

const ActivityList = ({data, onClick}) =>
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

class App extends Component {
  state = {
    people: employees.map(() => false),
    dates: dates.map(() => true), // Select all years by default
    jonasPeople: Map(Object.keys(jonasCharactersData).map(k => [k, false])),
    jonasDates: jonasDatesMap // Use the full Jonas dates Map
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

  handleDateChange = (k, v, append) => {
    this.setState({
      dates: append
        ? this.state.dates.set(k, v)
        : this.state.dates.map((_,k2) => k === k2)
    });
  }

  handleJonasCharacterChange = value => {
    const selection = Set(value.split(DELIIMTER));
    this.setState({
      jonasPeople: this.state.jonasPeople.map((_, k) => selection.has(k))
    });
  };

  handleJonasDateChange = (k, v, append) => {
    this.setState({
      jonasDates: append
        ? this.state.jonasDates.set(k, v)
        : this.state.jonasDates.map((_, k2) => k === k2)
    });
  };

  handleJonasCharacterClick = values => {
    const selection = Set(values.map(d => d.name));
    this.setState({
      jonasPeople: this.state.jonasPeople.map((v, k) => selection.has(k))
    });
  };

  render() {
    const { people, dates, jonasPeople, jonasDates } = this.state;
    
    // Martha data
    const nFiltered = people.valueSeq().reduce((v, sum) => v + sum, 0);
    const data = allEvents
      .filter(d => nFiltered === 0 || people.get(d.name))
      .filter(d => dates.get(d.date.split('-')[2]));
    const storylines = SvenLayout()
      .time(d => parseInt(d.date.split('-')[2]))
      .id(d => String([d.name, d.date]))
      .group(d => d.activity)(data);
    const ymin = min(storylines.interactions, d => d.y0);
    const ymax = max(storylines.interactions, d => d.y1);

    // Jonas data processing - simplified like Martha
    const jonasAllNames = Object.keys(jonasCharactersData);
    const jonasAllEvents = [...jonasEvents];
    
    // Add placeholder events for missing character-year combinations (like Martha)
    jonasAllowedYears.forEach(year => {
      jonasAllNames.forEach(name => {
        const hasEvent = jonasEvents.some(e => e.name === name && extractYear(e.date) === String(year));
        if (!hasEvent) {
          jonasAllEvents.push({
            date: `01-01-${year}`,
            name,
            activity: 'None',
            description: '',
            important: false,
            death: false
          });
        }
      });
    });

    const jonasNFiltered = jonasPeople.valueSeq().reduce((v, sum) => v + sum, 0);
    const jonasData = jonasAllEvents
      .filter(d => jonasNFiltered === 0 || jonasPeople.get(d.name))
      .filter(d => jonasDates.get(String(extractYear(d.date))));

    const jonasStorylines = jonasLayout(jonasData);
    const jonasYmin = min(jonasStorylines.interactions, d => d.y0);
    const jonasYmax = max(jonasStorylines.interactions, d => d.y1);
    const jonasColor = scaleOrdinal(schemeCategory10);
    
    return (
      <Grid container spacing={4}>
        {/* Martha Chart */}
        <Grid item xs={12} sm={6}>
          <Card>
            <CardHeader title='Martha Timeline Years' subheader='click to include data from specific years (1920, 1985, 1986, 2019, 2040, 2052)'/>
            <CardContent>
              <DatesSelect data={dates} onChange={this.handleDateChange}/>
            </CardContent>
          </Card>
          <Card>
            <CardHeader title='Martha Filter by Character' subheader='show specific characters only'/>
            <CardContent>
              <CharacterSelect data={people} onChange={this.handleCharacterChange}/>
            </CardContent>
          </Card>
          <Paper style={{marginTop: 16}}>
            <StorylineChart
              data={storylines}
              height={Math.max(10*(ymax - ymin), 50)}
              color={d => color(employeesData[d.values[0].data.name])}
              lineLabel={d => d.values[0].data.activity}
              lineTitle={d => d.values[0].data.date + ' - ' + d.values[0].data.activity}
              groupLabel={d => d.name}
              onClick={this.handleCharacterClick}
            />
          </Paper>
        </Grid>
        {/* Jonas Chart */}
        <Grid item xs={12} sm={6}>
          <Card>
            <CardHeader title='Jonas Timeline Years' subheader='click to include data from specific years'/>
            <CardContent>
              <DatesSelect data={jonasDates} onChange={this.handleJonasDateChange}/>
            </CardContent>
          </Card>
          <Card>
            <CardHeader title='Jonas Filter by Character' subheader='show specific characters only'/>
            <CardContent>
              <CharacterSelect data={jonasPeople} onChange={this.handleJonasCharacterChange}/>
            </CardContent>
          </Card>
          <Paper style={{marginTop: 16}}>
            <StorylineChart
              data={jonasStorylines}
              height={Math.max(10*(jonasYmax - jonasYmin), 50)}
              color={d => jonasColor(jonasCharactersData[d.values[0].data.name])}
              lineLabel={d => d.values[0].data.activity}
              lineTitle={d => d.values[0].data.date + ' - ' + d.values[0].data.activity}
              groupLabel={d => d.name}
              onClick={this.handleJonasCharacterClick}
              xAxisData={jonasAllowedYears}
            />
          </Paper>
        </Grid>
      </Grid>
    );
  }
}

export default App;