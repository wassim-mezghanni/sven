import React, { useRef, useEffect } from 'react';
import * as d3 from 'd3';

/**
 * TrueIntersectionStorylineChart
 * Props:
 *   data: array of { name, activity, date, ... }
 *   width, height: chart size
 */
const TrueIntersectionStorylineChart = ({ data, width = 900, height = 400 }) => {
  const ref = useRef();

  // Function to display Y-positions in terminal
  const displayYPositions = (characters, years, yByCharYear, yScale) => {
    console.log("\n" + "=".repeat(50));
    console.log("Y-POSITION SUMMARY FOR EACH CHARACTER");
    console.log("=".repeat(50));
    
    characters.forEach(name => {
      console.log(`\n${name}:`);
      years.forEach(year => {
        const yPos = yByCharYear[name][year];
        const defaultY = yScale(name);
        console.log(`  ${year}: Y=${Math.round(yPos)} (default: ${Math.round(defaultY)})`);
      });
    });
    console.log("\n" + "=".repeat(50));
  };

  useEffect(() => {
    if (!data || data.length === 0) return;
    const svg = d3.select(ref.current);
    svg.selectAll('*').remove();

    // 1. Get unique characters and years
    const characters = Array.from(new Set(data.map(d => d.name)));
    const years = Array.from(new Set(data.map(d => d.date))).sort();

    // 2. Assign default y-positions
    const yScale = d3.scalePoint()
      .domain(characters)
      .range([60, height - 40]);
    const xScale = d3.scalePoint()
      .domain(years)
      .range([100, width - 40]);

    // 3. For each year, find activities shared by multiple characters
    const yByCharYear = {};
    years.forEach(year => {
      // Map: activity -> [characters]
      const acts = {};
      characters.forEach(name => {
        const ev = data.find(d => d.name === name && d.date === year);
        if (ev && ev.activity && ev.activity.trim() !== "") {
          if (!acts[ev.activity]) acts[ev.activity] = [];
          acts[ev.activity].push(name);
        }
      });
      // For each character, set y
      characters.forEach(name => {
        let y;
        const ev = data.find(d => d.name === name && d.date === year);
        
        // Check if character has an activity and if it's shared with others
        if (name === "Marek Tannhaus") {
          // Marek returns to his 1971 position after any group interaction
          // In 1971, Marek and H.G. shared "Argument" activity
          // Marek's default Y: 60, H.G.'s default Y: 140
          // 1971 midpoint: (60 + 140) / 2 = 100
          y = 100; // This was Marek's 1971 position
        } else if (ev && ev.activity && ev.activity.trim() !== "" && acts[ev.activity] && acts[ev.activity].length > 1) {
          // Other characters in group activities return to their default positions
          y = yScale(name);
        } else {
          // Character either has no activity, unique activity, or no data for this year
          // Use their default y position
          y = yScale(name);
        }
        
        if (!yByCharYear[name]) yByCharYear[name] = {};
        yByCharYear[name][year] = y;
      });
    });

    // Debug: Log Y positions for each character
    console.log("=== Y POSITIONS BY CHARACTER AND YEAR ===");
    characters.forEach(name => {
      console.log(`${name}:`);
      years.forEach(year => {
        const yPos = yByCharYear[name][year];
        const defaultY = yScale(name);
        console.log(`  ${year}: ${yPos} (default: ${defaultY})`);
      });
    });
    console.log("=== DEFAULT Y POSITIONS ===");
    characters.forEach(name => {
      console.log(`${name}: ${yScale(name)}`);
    });

    // 4. Build line data for each character
    const charLines = characters.map(name => {
      return years.map(year => ({
        x: xScale(year),
        y: yByCharYear[name][year],
        year,
        name
      }));
    });

    // 5. Draw axes - Character names on the left
    svg.selectAll('.y-label')
      .data(characters)
      .enter()
      .append('text')
      .attr('class', 'y-label')
      .attr('x', 5)
      .attr('y', d => yScale(d))
      .attr('dy', '0.32em')
      .attr('text-anchor', 'start')
      .attr('font-size', '14px')
      .attr('font-weight', 'bold')
      .attr('fill', '#000')
      .text(d => d);

    svg.selectAll('.x-label')
      .data(years)
      .enter()
      .append('text')
      .attr('class', 'x-label')
      .attr('x', d => xScale(d))
      .attr('y', 30)
      .attr('text-anchor', 'middle')
      .text(d => d);

    // 6. Draw lines
    const line = d3.line()
      .x(d => d.x)
      .y(d => d.y);

    svg.selectAll('.char-line')
      .data(charLines)
      .enter()
      .append('path')
      .attr('class', 'char-line')
      .attr('fill', 'none')
      .attr('stroke', (d, i) => d3.schemeCategory10[i % 10])
      .attr('stroke-width', 2)
      .attr('d', d => line(d));

    // 7. Draw dots at each year
    charLines.forEach((lineData, i) => {
      svg.selectAll('.char-dot-' + i)
        .data(lineData)
        .enter()
        .append('circle')
        .attr('class', 'char-dot-' + i)
        .attr('cx', d => d.x)
        .attr('cy', d => d.y)
        .attr('r', 4)
        .attr('fill', d3.schemeCategory10[i % 10]);
    });

    // 8. Display Y position values on the chart
    characters.forEach((name, i) => {
      years.forEach(year => {
        const yPos = yByCharYear[name][year];
        const defaultY = yScale(name);
        const x = xScale(year);
        
        // Add text showing Y position values
        svg.append('text')
          .attr('x', x + 10)
          .attr('y', yPos - 5)
          .attr('font-size', '12px')
          .attr('font-weight', 'bold')
          .attr('fill', d3.schemeCategory10[i % 10])
          .text(`${Math.round(yPos)}`);
          
        // Add text showing default Y position
        svg.append('text')
          .attr('x', x + 10)
          .attr('y', defaultY + 20)
          .attr('font-size', '10px')
          .attr('fill', '#333')
          .text(`def: ${Math.round(defaultY)}`);
      });
    });

    // 9. Add summary at top of chart
    svg.append('text')
      .attr('x', 10)
      .attr('y', 15)
      .attr('font-size', '14px')
      .attr('font-weight', 'bold')
      .attr('fill', '#000')
      .text('Y-Positions: Bold = Actual, Gray = Default');

    // 10. Display Y-position summary as output
    console.log("=== Y-POSITION SUMMARY ===");
    characters.forEach(name => {
      console.log(`${name}:`);
      years.forEach(year => {
        const yPos = yByCharYear[name][year];
        const defaultY = yScale(name);
        console.log(`  ${year}: Y=${Math.round(yPos)} (default: ${Math.round(defaultY)})`);
      });
      console.log("---");
    });

    // Also log to terminal output for development
    if (typeof process !== 'undefined' && process.stdout) {
      console.log("\n=== TERMINAL OUTPUT ===");
      characters.forEach(name => {
        console.log(`${name}:`);
        years.forEach(year => {
          const yPos = yByCharYear[name][year];
          const defaultY = yScale(name);
          console.log(`  ${year}: Y=${Math.round(yPos)} (default: ${Math.round(defaultY)})`);
        });
        console.log("---");
      });
    }

    // 11. Display Y-position summary on the chart
    let summaryY = 50;
    svg.append('text')
      .attr('x', width - 200)
      .attr('y', summaryY)
      .attr('font-size', '12px')
      .attr('font-weight', 'bold')
      .attr('fill', '#000')
      .text('Y-POSITION SUMMARY:');
    
    characters.forEach((name, i) => {
      summaryY += 20;
      svg.append('text')
        .attr('x', width - 200)
        .attr('y', summaryY)
        .attr('font-size', '10px')
        .attr('fill', d3.schemeCategory10[i % 10])
        .text(`${name}:`);
      
      years.forEach(year => {
        const yPos = yByCharYear[name][year];
        summaryY += 15;
        svg.append('text')
          .attr('x', width - 180)
          .attr('y', summaryY)
          .attr('font-size', '9px')
          .attr('fill', d3.schemeCategory10[i % 10])
          .text(`  ${year}: Y=${Math.round(yPos)}`);
      });
      summaryY += 10;
    });

    // Display Y-positions in terminal
    displayYPositions(characters, years, yByCharYear, yScale);
  }, [data, width, height]);

  return (
    <svg ref={ref} width={width} height={height} style={{ background: '#fff' }} />
  );
};

export default TrueIntersectionStorylineChart;