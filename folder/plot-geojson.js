import * as d3 from 'https://cdn.skypack.dev/d3@7';
import { convertCsvToGeoJson } from './script.js';
import { globalState } from './config.js';
import { setup } from './piechart.js';

// Color combination
const colors = {
  mapFill: "#faf3e1",
  mapBorder: "#5e5a51",
  hoverFill: "#ffcc00",
  hoverBorder: "#ff9900",
  circleFill: "#293742",
  circleHover: "#d2e0f5"
};

// Function to plot GeoJSON data on the map
function plotGeoJson(geojson, geoJsonGroup, path) {
  console.log("Plotting GeoJSON Data:", geojson);

  geoJsonGroup.selectAll("path")
    .data(geojson.features)
    .enter().append("path")
    .attr("d", path)
    .attr("stroke", colors.mapBorder)
    .attr("fill", colors.mapFill)
    .style("z-index", 3)
}



// Function to plot points from GeoJSON data
function plotPoints(geojson, geoJsonGroup, projection) {
  console.log("Plotting Points Data:", geojson);
  console.log("Projection:", projection);
  console.log("GeoJSON Group:", geoJsonGroup);

  // Create a tooltip
  const tooltip = d3.select("#tooltip")
  const tooltipLabel = d3.select("#tooltip-text-label")
  const tooltipText = d3.select("#tooltip-text-value")
  const offsetX = 10
  const offsetY = 10
  const pointRadius = 5


  const colorScale = d3.scaleSequential(d3.interpolateReds)
  .domain(d3.extent(geojson.features, d => d.properties.avgPM25));

  const sizeScale = d3.scaleLinear().domain(d3.extent(geojson.features, d => d.properties.avgPM25)).range([2, 15]);

  geoJsonGroup.selectAll("circle").remove();
  
  geoJsonGroup.selectAll("circle")
    .data(geojson.features)
    .enter().append("circle")
    .attr("cx", d => {
      const [x, y] = projection(d.geometry.coordinates);
      console.log(`Coordinates for ${d.properties.name}: (${x}, ${y})`);
      return x;
    })
    .attr("cy", d => projection(d.geometry.coordinates)[1])
    // .attr("r", d => sizeScale(d.properties.avgPM25))
    .attr("r", pointRadius)
    .attr("fill", d => colorScale(d.properties.avgPM25))
    .attr("class", "map-circle")
    .on("mouseover", function(event, d) {
      d3.select(this)
        // .attr("fill", "000000")
        // .attr("r", 2);  // Increase radius on hover
        .attr("r", pointRadius * 2)

        tooltip.style("display", "block")
        tooltipLabel.text(d.properties.name);
        tooltipText.text(`Avg PM2.5: ${d.properties.avgPM25.toFixed(2)}`)
        setup(globalState, d.properties.name);
    })
    .on("mouseout", function(event, d) {
      d3.select(this)
        .attr("fill", d => colorScale(d.properties.avgPM25))  
        // .attr("r", d => sizeScale(d.properties.avgPM25));  // Revert radius
        .attr("r", pointRadius)
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
          x = event.pageX - modalWidth - offsetX;
      }

      // Adjust y position if the modal goes off the bottom edge
      if (y + modalHeight > viewportHeight) {
        y = event.pagey - modalHeight - offsetY;
      }

      tooltip.style("left", x + "px")
        .style("top", y + "px");
      
    });
}


function updateCircleSizes(year, geoJsonGroup, projection) {
  const filePath = `data/${year}.csv`;
  console.log("File Path:", filePath); // Debugging log
  convertCsvToGeoJson(filePath, function(geojson) {
    const sizeScale = d3.scaleLinear()
      .domain(d3.extent(geojson.features, d => d.properties.avgPM25))
      .range([2, 15]);

    geoJsonGroup.selectAll("circle")
      .data(geojson.features)
      .transition()
      .duration(1000)
      .attr("r", d => sizeScale(d.properties.avgPM25));
  });
}

// Main function to load and plot data
function main() {
  const width = 600;
  const height = 800;
  const targetSize = .75 * window.innerHeight;
  const scale = targetSize/616;

  const projection = d3.geoMercator()
    .scale(5000 * scale)
    .center([-111.0937, 39.3200]);

  const path = d3.geoPath().projection(projection);

  const svg = d3.select("#utah-map-svg")
    .attr("width", width)
    .attr("height", height);
  const geoJsonGroup = svg.append("g")

  // Load and plot filtered GeoJSON data
  d3.json("data/counties.geojson").then(function(data) {
    console.log("Loaded GeoJSON Data:", data);

    const filteredData = {
      type: "FeatureCollection",
      features: data.features.filter(d => d.properties.STATEFP === "49")
    };

    console.log("Filtered GeoJSON Data:", filteredData);
    
    plotGeoJson(filteredData, geoJsonGroup, path);
    // Calculate bounds of the content
    const bounds = geoJsonGroup.node().getBBox();

    svg.attr("width", bounds.width + (50 * scale))
    .attr("height", bounds.height + (50* scale))
    .attr("viewBox", `${bounds.x} ${bounds.y} ${bounds.width} ${bounds.height}`)

    // geoJsonGroup.attr("transform", `translate(${bounds.width/(5*scale)}, ${bounds.height/(1.5*scale)})`)

  }).catch(function(error) {
    console.error("Error loading the GeoJSON data:", error);
  });
  
  // SET DEFAULTS
  console.log("VALUE", d3.select(".dropdown-menu").property("value"));
  const year = d3.select(".dropdown-menu").property("value")
  d3.select("#selected-year").text(year);

  const filePath = `data/${year}.csv`;

  globalState.data = filePath;
  globalState.year = year;
  globalState.medalPlot = "pieChart";

  convertCsvToGeoJson(filePath, function(geojson) {
    console.log("Check after selecting year, call this plot function");
    plotPoints(geojson, geoJsonGroup, projection);
  });

  // On selection change

  d3.selectAll(".dropdown-menu").on("change", function(event) {
    const year = this.value;
    console.log("Year selected:", year); // Debugging log
    // Load the GeoJSON data and update the modal content based on the selected year

    d3.select("#selected-year").text(year);


    const filePath = `data/${year}.csv`;

    globalState.data = filePath;
    globalState.year = year;
    globalState.medalPlot = "pieChart";

    console.log("File Path:", filePath); // Debugging log

    console.log("Global State:", globalState);


    

    convertCsvToGeoJson(filePath, function(geojson) {
      console.log("Check after selecting year, call this plot function");
      plotPoints(geojson, geoJsonGroup, projection);
    });

  });

  


  
  // Convert CSV to GeoJSON and plot the data
  // convertCsvToGeoJson("data/test.csv", function(geojson) {
  //   plotPoints(geojson, geoJsonGroup, projection);
  // });
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

let isModalOpen = true;
// Toggle function to open and close the modal
function toggleModal() {
    const sideModalContainer = d3.select("#side-modal-container");
    const buttonContainer = d3.select("#button-container")
    const arrowIcon = d3.select("#arrow-icon");

    if (isModalOpen) {
        // Close the modal
        sideModalContainer.style("right", "-270px"); // Slide container off-screen
        arrowIcon.style("transform", "scaleX(1)"); // Flip arrow to point right
        buttonContainer.style("margin-right", "100px"); 
    } else {
        // Open the modal
        sideModalContainer.style("right", "0"); // Slide container into view
        arrowIcon.style("transform", "scaleX(-1)"); // Flip arrow to point left
        buttonContainer.style("margin-right", "20px");
    }

    // Toggle the state
    isModalOpen = !isModalOpen;

    
}

// d3.select("#Spring").dispatch("click");




// Run the main function
main();
