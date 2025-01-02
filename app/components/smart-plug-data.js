"use client"; // Marking this file as a client-side component

import React, { useState, useEffect } from 'react';
import { Row, Col, Form, InputGroup, Card, ToggleButtonGroup, ToggleButton, CardGroup } from 'react-bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';
import axios from 'axios';
import DataTable from 'react-data-table-component';  // Import react-data-table-component
import Chart from 'react-apexcharts'; // Import ApexCharts
import "react-datepicker/dist/react-datepicker.css";
import moment from 'moment'; // Import moment.js for date formatting

const SmartPlugData = () => {
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  const [deviceData, setDeviceData] = useState([]);
  const [aggregatedData, setAggregatedData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [dataType, setDataType] = useState('aggregated');  // Default to aggregated data
  const [aggregationType, setAggregationType] = useState('hour');
  const [chartData, setChartData] = useState([]);
  const [chartOptions, setChartOptions] = useState({
    chart: {
      id: 'basic-chart',
      zoom: { enabled: false },
    },
    xaxis: { categories: [] },
    yaxis: { title: { text: 'Value' }, labels: { formatter: (val) => val.toFixed(2) } }, // Format y-axis labels to 2 decimals
    title: { text: 'Aggregated Data' },
    dataLabels: { enabled: false }, // Disable data labels
    tooltip: {
      enabled: true, // Enable tooltips
    },
    interactions: {
      enabled: true, // Enable interactions for tooltips
    },
  });

  const [unitType, setUnitType] = useState('Wh'); // Wh or kWh switch state
  const [deviceColumnsVisibility, setDeviceColumnsVisibility] = useState({
    time: true,
    country: true,
    town: true,
    current: true,
    switchStatus: true,
    volt: true,
    watts: true,
  });

  const [aggregatedColumnsVisibility, setAggregatedColumnsVisibility] = useState({
    time: true,
    avgWatts: true,
    maxWatts: true,
    minWatts: true,
    avgVoltage: true,
    avgCurrent: true,
    count: true,
    durationInSeconds: true,
    wh: true,
    kWh: true,
  });

  const fetchData = async () => {
    if (!startDate || !endDate) return;

    setLoading(true);
    setError(null);

    const formattedStartDate = startDate.toISOString().split('T')[0];
    const formattedEndDate = endDate.toISOString().split('T')[0];

    try {
      let url = `/api/smart-plug?startDate=${formattedStartDate}&endDate=${formattedEndDate}&dataType=${dataType}`;

      if (dataType === 'aggregated') {
        url += `&aggregationType=${aggregationType}`;
      }

      const response = await axios.get(url);

      if (dataType === 'deviceData') {
        setDeviceData(response.data);
        setAggregatedData([]);
        setChartData([]); // Clear chart data when switching to device data
      } else {
        setAggregatedData(response.data);
        setDeviceData([]);
        updateChartData(response.data);
      }
    } catch (err) {
      setError('Error fetching data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [startDate, endDate, dataType, aggregationType]);

  useEffect(() => {
    // Initial data fetch
    fetchData();

    // Set interval to fetch data every 60 minutes (3600000 ms)
    const intervalId = setInterval(() => {
      fetchData();
    }, 3600000); // 3600000 ms = 60 minutes

    // Cleanup the interval on component unmount
    return () => clearInterval(intervalId);
  }, [startDate, endDate, dataType, aggregationType]);
  
  // Update chart data whenever unitType, aggregationType, or aggregatedData changes
  useEffect(() => {
    if (aggregatedData.length > 0) {
      updateChartData(aggregatedData);
    }
  }, [unitType, aggregationType, aggregatedData]);

  const updateChartData = (data) => {
    const categories = data.map((item) => item.time);
    let seriesData = data.map((item) => unitType === 'Wh' ? item.watthours : item.watthours / 1000); // Use kWh if unitType is kWh

    if (aggregationType === 'minute') {
      // Line chart for minute aggregation
      setChartOptions({
        ...chartOptions,
        chart: { type: 'line' },
        xaxis: { categories },
        yaxis: { title: { text: `${unitType}` }, labels: { formatter: (val) => val.toFixed(2) } },
        title: { text: `${unitType} Aggregation (Per Minute)` },
      });
    } else {
      // Bar chart for other aggregation types
      setChartOptions({
        ...chartOptions,
        chart: { type: 'bar' },
        xaxis: { categories },
        yaxis: { title: { text: `${unitType}` }, labels: { formatter: (val) => val.toFixed(2) } },
        title: { text: `${unitType} Aggregation` },
      });
    }

    setChartData([
      {
        name: unitType,
        data: seriesData,
      },
    ]);
  };

// Date format function based on aggregation type
const formatDate = (date, aggregationType) => {
  switch (aggregationType) {
    case 'minute':
      return moment(date).format('YY-M-D HH:mm'); // Minute level format
    case 'hour':
      return moment(date).format('YY-M-D  HH'); // Hour level format
    case 'day':
      return moment(date).format('YY-M-D'); // Day level format
    case 'month':
      return moment(date).format('YY-MM'); // Month level format
    case 'year':
      return moment(date).format('YYYY'); // Year level format
    default:
      return moment(date).format('YY-M-D'); // Default to day format
  }
};
  const aggregatedColumns = [
    { name: '#', selector: row => row.index, sortable: true, visible: aggregatedColumnsVisibility.time },
    { name: 'Time', selector: row => formatDate (row.time, aggregationType), sortable: true, visible: aggregatedColumnsVisibility.time },
    { name: 'Avg Voltage', selector: row => row.volt ? row.volt.toFixed(2): 0, sortable: true, visible: aggregatedColumnsVisibility.avgVoltage },
    { name: 'Avg Current', selector: row => row.current ? row.current.toFixed(2) : 0, sortable: true, visible: aggregatedColumnsVisibility.avgCurrent },
    { name: 'Avg Watts', selector: row => row.watts? row.watts.toFixed(2):0, sortable: true, visible: aggregatedColumnsVisibility.avgWatts },
    { name: 'Max Watts', selector: row =>row.maxWatts? row.maxWatts.toFixed(2):0, sortable: true, visible: aggregatedColumnsVisibility.maxWatts },
    { name: 'Min Watts', selector: row => row.minWatts? row.minWatts.toFixed(2):0, sortable: true, visible: aggregatedColumnsVisibility.minWatts },
    { name: 'Count', selector: row => row.count, sortable: true, visible: aggregatedColumnsVisibility.count },
    { name: 'Duration (Seconds)', selector: row => row.durationInSeconds, sortable: true, visible: aggregatedColumnsVisibility.durationInSeconds },
    { name: 'Wh', selector: row => row.watthours? row.watthours.toFixed(2):0, sortable: true, visible: aggregatedColumnsVisibility.wh },
    { name: 'kWh', selector: row => row.watthours? (row.watthours / 1000).toFixed(2):0, sortable: true, visible: aggregatedColumnsVisibility.kWh }
  ];

  const rawDataColumns = [
    { name: 'Time', selector: row => formatDate(row.updateTime,aggregationType), sortable: true, visible: deviceColumnsVisibility.time },
    { name: 'Country', selector: row => row.country, sortable: true, visible: deviceColumnsVisibility.country },
    { name: 'Town', selector: row => row.town, sortable: true, visible: deviceColumnsVisibility.town },
    { name: 'Current', selector: row => row.current ? row.current.toFixed(2) : 0, sortable: true, visible: deviceColumnsVisibility.current },
    { name: 'Status', selector: row => row.switchStatus, sortable: true, visible: deviceColumnsVisibility.switchStatus },
    { name: 'Voltage', selector: row => row.volt ? row.volt.toFixed(2): 0, sortable: true, visible: deviceColumnsVisibility.volt },
    { name: 'Watts', selector: row => row.watts.toFixed(2), sortable: true, visible: deviceColumnsVisibility.watts }
  ];

  // Handle screen resize to adjust column visibility
  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;

      // Adjust column visibility based on the screen width
      if (width < 576) {  // xs
        setDeviceColumnsVisibility({
          time: true,
          country: false,
          town: false,
          current: true,
          switchStatus: false,
          volt: true,
          watts: true,
        });
        setAggregatedColumnsVisibility({
          time: true,
          avgWatts: false,
          maxWatts: false,
          minWatts: false,
          avgVoltage: false,
          avgCurrent: false,
          count: false,
          durationInSeconds: false,
          wh: true,
          kWh:true,
        });
      } else if (width < 768) {  // sm
        setDeviceColumnsVisibility({
          time: true,
          country: false,
          town: false,
          current: true,
          switchStatus: false,
          volt: true,
          watts: true,
        });
        setAggregatedColumnsVisibility({
          time: true,
          avgWatts: false,
          maxWatts: false,
          minWatts: false,
          avgVoltage: false,
          avgCurrent: true,
          count: false,
          durationInSeconds: false,
          wh: true,
          kWh:true,
        });

      } else if (width < 992) {  // md
        setDeviceColumnsVisibility({
          time: true,
          country: true,
          town: true,
          current: true,
          switchStatus: true,
          volt: true,
          watts: true,
        });
        setAggregatedColumnsVisibility({
          time: true,
          avgWatts: true,
          maxWatts: false,
          minWatts: false,
          avgVoltage: true,
          avgCurrent: true,
          count: false,
          durationInSeconds: false,
          wh: true,
          kWh: true,
        });
      } else if (width < 1200) {  // md
        setDeviceColumnsVisibility({
          time: true,
          country: true,
          town: true,
          current: true,
          switchStatus: true,
          volt: true,
          watts: true,
        });
        setAggregatedColumnsVisibility({
          time: true,
          avgWatts: true,
          maxWatts: true,
          minWatts: true,
          avgVoltage: true,
          avgCurrent: true,
          count: false,
          durationInSeconds: false,
          wh: true,
          kWh: true,
        });

      } else { // lg
        setDeviceColumnsVisibility({
          time: true,
          country: true,
          town: true,
          current: true,
          switchStatus: true,
          volt: true,
          watts: true,
        });
        setAggregatedColumnsVisibility({
          time: true,
          avgWatts: true,
          maxWatts: true,
          minWatts: true,
          avgVoltage: true,
          avgCurrent: true,
          count: true,
          durationInSeconds: true,
          wh: true,
          kWh: true,
        });
      }
    };

    handleResize();  // Call the resize handler once on mount

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);  // Empty dependency array ensures it runs only on mount

  return (
    <div>
      <Row>
        <Form style={{ display: 'flex', flexWrap: 'wrap', width: '100%' }}>
          {/* Start Date */}
          <Col xs={12} sm={6} md={4} lg={3} className="mb-3">
            <InputGroup className="mb-3" style={{ display: 'flex', alignItems: 'center' }}>
              <InputGroup.Text style={{ minWidth: '120px' }}>
                Start Date:
              </InputGroup.Text>
              <Form.Control
                type="date"
                value={startDate.toISOString().split('T')[0]}
                onChange={(e) => setStartDate(new Date(e.target.value))}
              />
            </InputGroup>
          </Col>

          {/* End Date */}
          <Col xs={12} sm={6} md={4} lg={3} className="mb-3">
            <InputGroup className="mb-3" style={{ display: 'flex', alignItems: 'center' }}>
              <InputGroup.Text style={{ minWidth: '120px' }}>
                End Date:
              </InputGroup.Text>
              <Form.Control
                type="date"
                value={endDate.toISOString().split('T')[0]}
                onChange={(e) => setEndDate(new Date(e.target.value))}
              />
            </InputGroup>
          </Col>

          {/* Data Type */}
          <Col xs={12} sm={6} md={4} lg={3} className="mb-3">
            <InputGroup className="mb-3" style={{ display: 'flex', alignItems: 'center' }}>
              <InputGroup.Text style={{ minWidth: '120px' }}>
                Data Type:
              </InputGroup.Text>
              <Form.Control
                as="select"
                value={dataType}
                onChange={(e) => setDataType(e.target.value)}
              >
                <option value="aggregated">Aggregated Data</option>
                <option value="deviceData">Device Data</option>
              </Form.Control>
            </InputGroup>
          </Col>

          {/* Aggregation Type (only shown for 'aggregated' data type) */}
          {dataType === 'aggregated' && (
            <Col xs={12} sm={6} md={4} lg={3} className="mb-3">
              <InputGroup className="mb-3" style={{ display: 'flex', alignItems: 'center' }}>
                <InputGroup.Text style={{ minWidth: '150px' }}>
                  Aggregation Type:
                </InputGroup.Text>
                <Form.Control
                  as="select"
                  value={aggregationType}
                  onChange={(e) => setAggregationType(e.target.value)}
                  style={{ flexGrow: 1 }}
                >
                  <option value="minute">Per Minute</option>
                  <option value="hour">Per Hour</option>
                  <option value="day">Per Day</option>
                  <option value="month">Per Month</option>
                  <option value="year">Per Year</option>
                </Form.Control>
              </InputGroup>
            </Col>
          )}
        </Form>
      </Row>
     

      {/* Loading Indicator */}
      {loading && <p>Loading...</p>}

      {/* Error Message */}
      {error && <p style={{ color: 'red' }}>{error}</p>}

      <Row>
        <Col>
          {/* Unit Toggle Switch (Wh / kWh) */}
          {dataType === 'aggregated' && (
            <div className="mb-4">
              <label>
                <strong>Toggle Unit: {unitType}</strong>
              </label>
              <Form.Check
                type="switch"
                id="unit-toggle"
                label={`Switch to ${unitType === 'Wh' ? 'kWh' : 'Wh'}`}
                checked={unitType === 'kWh'}
                onChange={() => setUnitType(unitType === 'Wh' ? 'kWh' : 'Wh')}
              />
            </div>
          )}
        </Col>
      </Row>
      {dataType === 'aggregated' && aggregatedData.length > 0 && (
        <Row className="mb-4" >
          <CardGroup>
          <Card border="primary"  style={{ display: 'flex' }} >
            <Card.Header className="bg-info text-light" >Energy</Card.Header>
              <Card.Body>
                <Card.Title> </Card.Title>
                <Card.Text>
                  Total: 
                  {aggregatedData.reduce((acc, curr) => acc + (unitType === 'Wh' ? curr.watthours : curr.watthours / 1000), 0).toFixed(2)} {unitType === 'Wh' ? 'Wh' : 'kWh'}
                </Card.Text>
                <Card.Text>
                  Avg: 
                  {unitType === 'Wh'? (aggregatedData.reduce((acc, curr) => acc + curr.watthours, 0) / aggregatedData.length).toFixed(2):((aggregatedData.reduce((acc, curr) => acc + curr.watthours, 0) / aggregatedData.length)/1000).toFixed(2)} {unitType === 'Wh' ? 'Wh' : 'kWh'}
                </Card.Text>
              </Card.Body>
              <Card.Footer>  
                <small className="text-muted">Aggregated per {aggregationType} for the period</small>
              </Card.Footer>
            </Card>

            <Card border="primary"  style={{ display: 'flex' }}>
            <Card.Header className="bg-info text-light" >Power</Card.Header>
              <Card.Body>
                <Card.Title> </Card.Title>
                <Card.Text>
                  Max:{Math.max(...aggregatedData.map(item => item.maxWatts)).toFixed(2)}W
                </Card.Text>
                <Card.Text>
                  Min: {Math.min(...aggregatedData.map(item => item.minWatts)).toFixed(2)}W
                </Card.Text>
                <Card.Text>
                  Avg: {((aggregatedData.reduce((acc, curr) => acc + curr.watts, 0))/ aggregatedData.length).toFixed(2)}W
                </Card.Text>
              </Card.Body>
              <Card.Footer>  
                <small className="text-muted">Max, Min & Avg for the period</small>
              </Card.Footer>
            </Card>

            <Card border="primary"  style={{ display: 'flex' }}>
            <Card.Header className="bg-info text-light" >Current</Card.Header>
              <Card.Body>
                <Card.Title> </Card.Title>
                <Card.Text>
                  Max :{Math.max(...aggregatedData.map(item => item.current/1000)).toFixed(2)}A
                </Card.Text>
                <Card.Text>
                  Min: {Math.min(...aggregatedData.map(item => item.current/1000)).toFixed(2)}A
                </Card.Text>
                <Card.Text>
                  Avg: {(((aggregatedData.reduce((acc, curr) => acc + curr.current, 0))/ aggregatedData.length)/1000).toFixed(2)}A
                </Card.Text>
              </Card.Body>
              <Card.Footer>  
                <small className="text-muted">Max, Min & Avg for the period</small>
              </Card.Footer>
            </Card>

            <Card border="primary"  style={{ display: 'flex' }}>
            <Card.Header className="bg-info text-light" >Voltage</Card.Header>
              <Card.Body>
                <Card.Title> </Card.Title>
                <Card.Text>
                  Max:{Math.max(...aggregatedData.map(item => item.volt)).toFixed(2)}V
                </Card.Text>
                <Card.Text>
                  Min: {Math.min(...aggregatedData.map(item => item.volt)).toFixed(2)}V
                </Card.Text>
                <Card.Text>
                  Avg: {((aggregatedData.reduce((acc, curr) => acc + curr.volt, 0))/ aggregatedData.length).toFixed(2)}V
                </Card.Text>
              </Card.Body>
              <Card.Footer>  
                <small className="text-muted">Max, Min & Avg for the period</small>
              </Card.Footer>
            </Card>

            

          </CardGroup>
        </Row>
      )}
      <Row>
        <Col>
          {/* Display Aggregated Data Chart */}
          {dataType === 'aggregated' && (
            <Chart
              options={chartOptions}
              series={chartData}
              type={chartOptions.chart.type}
              height={350}
            />
          )}
        </Col>
      </Row>

      <Row>
        <Col>
          {/* Data Table Display */}
          {dataType === 'deviceData' && (
            <div className="table-responsive">
              <DataTable
                title="Device Data"
                columns={rawDataColumns.filter(col => col.visible)}
                data={deviceData}
                pagination
              />
            </div>
          )}

          {dataType === 'aggregated' && (
            <div className="table-responsive">
              <DataTable
                title="Aggregated Data"
                columns={aggregatedColumns.filter(col => col.visible)}
                data={aggregatedData}
                pagination
              />
            </div>
          )}
        </Col>
      </Row>
    </div>
  );
};

export default SmartPlugData;
