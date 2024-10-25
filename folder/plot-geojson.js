import * as d3 from 'https://cdn.skypack.dev/d3@7';
import { convertCsvToGeoJson } from './script.js';

// Color combination
const colors = {
  mapFill: "#c2cfd3",
  mapBorder: "#5e5a51",
  hoverFill: "#ffcc00",
  hoverBorder: "#ff9900",
  circleFill: "#293742",
  circleHover: "#d2e0f5"
};

// Function to plot GeoJSON data on the map
function plotGeoJson(geojson, svg, path) {
  console.log("Plotting GeoJSON Data:", geojson);

  svg.selectAll("path")
    .data(geojson.features)
    .enter().append("path")
    .attr("d", path)
    .attr("stroke", colors.mapBorder)
    .attr("fill", colors.mapFill)
    .on("mouseover", function(event, d) {
      d3.select(this)
        .attr("fill", colors.hoverFill)  // Change fill color on hover
        .attr("stroke", colors.hoverBorder)  // Change stroke color on hover
    })
    .on("mouseout", function(event, d) {
      d3.select(this)
        .attr("fill", colors.mapFill)  // Revert fill color
        .attr("stroke", colors.mapBorder)  // Revert stroke color
    });
}

// Function to plot points from GeoJSON data
function plotPoints(geojson, svg, projection) {
  console.log("Plotting Points Data:", geojson);

  // Create a tooltip
  const tooltip = d3.select("#tooltip")
  const tooltipLabel = d3.select("#tooltip-text-label")
  const tooltipText = d3.select("#tooltip-text-value")
  const offsetX = 10
  const offsetY = 10

  svg.selectAll("circle")
    .data(geojson.features)
    .enter().append("circle")
    .attr("cx", d => {
      const [x, y] = projection(d.geometry.coordinates);
      console.log(`Coordinates for ${d.properties.name}: (${x}, ${y})`);
      return x;
    })
    .attr("cy", d => projection(d.geometry.coordinates)[1])
    .attr("r", 5)
    .attr("fill", colors.circleFill)
    .on("mouseover", function(event, d) {
      d3.select(this)
        .attr("fill", colors.circleHover)  // Change fill color on hover
        .attr("r", 8);  // Increase radius on hover

        tooltip.style("display", "block")
        tooltipLabel.text(d.properties.name);
        tooltipText.text(`Avg PM2.5: ${d.properties.avgPM25.toFixed(2)}`)
    })
    .on("mouseout", function(event, d) {
      d3.select(this)
        .attr("fill", colors.circleFill)  // Revert fill color
        .attr("r", 5);  // Revert radius

      tooltip.style("display", "none");
    })
    .on("mousemove", function(event) {
      let x = event.pageX + offsetX;
      let y = event.pageY + offsetY; 
      // Get the modal element's dimensions
      const modal = d3.select("#tooltip").node();
      const modalWidth = modal.offsetWidth;
      const modalHeight = modal.offsetHeight;
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      // Adjust x position if the modal goes off the right edge
      if (x + modalWidth > viewportWidth) {
          x = viewportWidth - modalWidth - offsetX;
      }

      // Adjust y position if the modal goes off the bottom edge
      if (y + modalHeight > viewportHeight) {
          y = viewportHeight - modalHeight - offsetY;
      }

      tooltip.style("left", x + "px")
        .style("top", y + "px");
      
    });
}

// Main function to load and plot data
function main() {
  const width = 600;
  const height = 800;

  const projection = d3.geoMercator()
    .scale(5000)
    .center([-111.0937, 39.3200])
    .translate([width / 2, height / 2]);

  const path = d3.geoPath().projection(projection);

  const svg = d3.select("#utah-map-svg");

  // Load and plot filtered GeoJSON data
  d3.json("data/counties.geojson").then(function(data) {
    console.log("Loaded GeoJSON Data:", data);

    const filteredData = {
      type: "FeatureCollection",
      features: data.features.filter(d => d.properties.STATEFP === "49")
    };

    console.log("Filtered GeoJSON Data:", filteredData);

    plotGeoJson(filteredData, svg, path);
  }).catch(function(error) {
    console.error("Error loading the GeoJSON data:", error);
  });

  // Convert CSV to GeoJSON and plot the data
  convertCsvToGeoJson("data/test.csv", function(geojson) {
    plotPoints(geojson, svg, projection);
  });
  // Set optional offsets if you want to adjust the modal's position slightly from the cursor
  const xOffset = 10; // Horizontal offset for the modal
  const yOffset = 10; // Vertical offset for the modal

  // Select the target div and bind the hover events
  // d3.select("#utah-map-svg")
  //   .on("mouseover", function (event) {
  //       // Show the modal on hover
  //       d3.select("#chart-modal").style("display", "block");
  //   })
  //   .on("mousemove", function (event) {
  //       // Get the viewport dimensions
  //       const viewportWidth = window.innerWidth;
  //       const viewportHeight = window.innerHeight;

  //       // Calculate initial modal position based on mouse coordinates
  //       let x = event.pageX + xOffset;
  //       let y = event.pageY + yOffset;

  //       // Get the modal element's dimensions
  //       const modal = d3.select("#chart-modal").node();
  //       const modalWidth = modal.offsetWidth;
  //       const modalHeight = modal.offsetHeight;

  //       // Adjust x position if the modal goes off the right edge
  //       if (x + modalWidth > viewportWidth) {
  //           x = viewportWidth - modalWidth - xOffset;
  //       }

  //       // Adjust y position if the modal goes off the bottom edge
  //       if (y + modalHeight > viewportHeight) {
  //           y = viewportHeight - modalHeight - yOffset;
  //       }

  //       // Apply the adjusted position to the modal
  //       d3.select("#chart-modal")
  //           .style("left", x + "px")
  //           .style("top", y + "px");
  //   })
  //   .on("mouseout", function () {
  //       // Hide the modal when the mouse leaves the div
  //       d3.select("#chart-modal").style("display", "none");
  //   });

    const sideButton = d3.select("#arrow-icon");

    sideButton.on("click", toggleModal);
}

let isModalOpen = false;
// Toggle function to open and close the modal
function toggleModal() {
    const sideModalContainer = d3.select("#side-modal-container");
    const buttonContainer = d3.select("#button-container")
    const arrowIcon = d3.select("#arrow-icon");

    if (isModalOpen) {
        // Close the modal
        sideModalContainer.style("right", "-250px"); // Slide container off-screen
        arrowIcon.style("transform", "scaleX(-1)"); // Flip arrow to point right
        buttonContainer.style("margin-right", "100px"); 
    } else {
        // Open the modal
        sideModalContainer.style("right", "0"); // Slide container into view
        arrowIcon.style("transform", "scaleX(1)"); // Flip arrow to point left
        buttonContainer.style("margin-right", "10px");
    }

    // Toggle the state
    isModalOpen = !isModalOpen;
}

// Run the main function
main();