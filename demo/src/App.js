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

import marthaCharacters from './data/martha-characters.json';
import marthaEvents from './data/martha-events.json';

import StorylineChart, {SvenLayout} from '../../src';

import './App.css';

const layout = SvenLayout()
  .time(d => parseInt(d.date))
  .id(d => String([d.name, d.date]))
  .group(d => d.name);

const color = scaleOrdinal(schemeCategory10);

const employees = Map(marthaCharacters);
const events = marthaEvents;

const employeesByType = Map().withMutations(map =>
  employees.map((v, k) => map.setIn([v, k], true))
);

// Include only the specific years that have events
const specificYears = ['1920', '1986', '2019', '2052']; // Updated to include all relevant years
const dates = Map(specificYears.map((year) => [year, false]));

class App extends Component {
  state = {
    people: employees.map(() => false),
    dates: dates.map(() => true) // Select all years by default
  };

  handleCharacterTypeClick = (k, v, append) => {
    if (append) {
      this.setState(({ people }) => ({
        people: people.set(k, !people.get(k)),
      }));
    } else {
      this.setState(({ people }) => ({
        people: people.map((value, key) => (key === k ? !value : value)),
      }));
    }
  };

  handleCharacterChange = value => {
    const selection =  Set(value.split(';'));
    this.setState(({ people }) => ({
      people: people.map((v, k) => selection.has(k)),
    }));
  };

  handleCharacterClick = values => {
    this.setState(({ people }) => ({
      people: people.map((v, k) => values.includes(k)),
    }));
  };

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

    const storylines = layout(data);
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
            <StorylineChart
              data={storylines}
              height={Math.max(10*(ymax - ymin), 50)}
              color={d => color(employeesData[d.values[0].data.name])}
              lineLabel={d => d.values[0].data.activity}
              lineTitle={d => d.values[0].data.date + ' - ' + d.values[0].data.description}
              groupLabel={d => d.name}
              onClick={this.handleCharacterClick}
            />
          </Paper>
        </Grid>

      </Grid>
    );
	}
}

export default App;
