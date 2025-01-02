import { RestClient } from '@ecoflow-api/rest-client';

const client = new RestClient({
  accessKey: process.env.NEXT_PUBLIC_ACCESS_KEY, // Publicly accessible access key
  secretKey: process.env.SECRET_KEY, // Secure secret key
  host: "https://api-e.ecoflow.com",
});

// Log environment variables to verify they are loaded correctly
console.log('Access Key:', process.env.NEXT_PUBLIC_ACCESS_KEY);
console.log('Secret Key:', process.env.SECRET_KEY);

// In-memory device data storage (simulating a database)
let deviceDataList = [];

// Function to fetch and store device data
async function controlSmartPlug() {
  try {
    const plainDevices = await client.getDevicesPlain();
    console.log("Devices:", plainDevices);

    const smartPlug = await client.getDevice("HW52ZKH4SF5T1769");
    console.log("Smart Plug:", smartPlug);

    const properties = await smartPlug.getProperties();

    // Convert updateTime from UTC+8 to Kenya Time (UTC+3) by subtracting 5 hours
    const updateTime_= new Date(properties['2_1.updateTime']);
    const updateTimeKenya = new Date(updateTime_.getTime() - (2 * 60 * 60 * 1000)); // Subtracting 2 hours from UTC+8 to get UTC+3

    const data = {
      updateTime: updateTimeKenya.toISOString(), // Converted to Kenya Time
      switchStatus: properties['2_1.switchSta'],
      country: properties['2_1.country'],
      town: properties['2_1.town'],
      volt: properties['2_1.volt'],
      current: properties['2_1.current'],
      watts: properties['2_1.watts'] / 10, // scaling down the value
    };

    console.log("Device Data:", data);
    deviceDataList.push(data);
  } catch (error) {
    console.error("Error:", error);
  }
}

// Fetch data every 10 seconds to update the deviceDataList in-memory
setInterval(controlSmartPlug, 10000); // 10000 ms = 10 seconds

// Handle GET request for the smart plug data
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");
  const aggregationType = searchParams.get("aggregationType");
  const dataType = searchParams.get("dataType");

  // Validate the presence of startDate and endDate
  if (!startDate || !endDate) {
    return new Response(
      JSON.stringify({ error: "Both startDate and endDate are required" }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    // Handle requests for raw device data
    if (dataType === "deviceData") {
      const deviceData = await getDeviceData(startDate, endDate);
      return new Response(JSON.stringify(deviceData), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Handle requests for aggregated data
    if (dataType === "aggregated" && aggregationType) {
      const aggregatedData = await getAggregatedData(startDate, endDate, aggregationType);
      return new Response(JSON.stringify(aggregatedData), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // If neither valid `deviceData` nor `aggregated` is provided, return error
    return new Response(
      JSON.stringify({ error: "Invalid dataType. Use 'deviceData' or 'aggregated'" }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: 'Error fetching or processing data' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

// Get raw deviceData (filter by date range)
async function getDeviceData(startDate, endDate) {
  return deviceDataList.filter(item => {
    const itemDate = new Date(item.updateTime).toISOString().split('T')[0]; // Format item date to 'YYYY-MM-DD'
    return itemDate >= startDate && itemDate <= endDate;
  });
}

// Aggregation function based on the aggregationType
async function getAggregatedData(startDate, endDate, aggregationType) {
  switch (aggregationType) {
    case 'minute':
      return aggregateByTimePeriod(startDate, endDate, 'minute');
    case 'hour':
      return aggregateByTimePeriod(startDate, endDate, 'hour');
    case 'day':
      return aggregateByTimePeriod(startDate, endDate, 'day');
    case 'month':
      return aggregateByTimePeriod(startDate, endDate, 'month');
    case 'year':
      return aggregateByTimePeriod(startDate, endDate, 'year');
    default:
      throw new Error('Unsupported aggregation type');
  }
}

// Generic aggregation function that can be used for all aggregation types
async function aggregateByTimePeriod(startDate, endDate, period) {
  const filteredData = deviceDataList.filter(item => {
    const itemDate = new Date(item.updateTime).toISOString().split('T')[0]; // Format item date to 'YYYY-MM-DD'
    return itemDate >= startDate && itemDate <= endDate;
  });

  // Aggregated data calculation
  const aggregated = {};
  let previousItem = null; // To store the previous data point for time difference calculation
  let index = 0;  // Initialize the index for each aggregation period

  filteredData.forEach(item => {
    // Convert updateTime to Kenya Time (UTC+3)
    const time = new Date(item.updateTime);
    const timeKenya = new Date(time.getTime()); 
    const timeKenya_ = new Date(time.getTime() - (3 * 60 * 60 * 1000)) // To adjust formattedTime to UTC+3 (Kenya Time)
    
    let formattedTime;

    // Aggregate based on the selected period (minute, hour, day, etc.)
    switch (period) {
      case 'minute':
        formattedTime = `${timeKenya_ .getFullYear()}-${timeKenya_ .getMonth() + 1}-${timeKenya_ .getDate()} ${timeKenya_ .getHours()}:${timeKenya_ .getMinutes()}`;
        break;
      case 'hour':
        formattedTime = `${timeKenya_ .getFullYear()}-${timeKenya_ .getMonth() + 1}-${timeKenya_ .getDate()} ${timeKenya_ .getHours()}:00`;
        break;
      case 'day':
        formattedTime = `${timeKenya_ .getFullYear()}-${timeKenya_ .getMonth() + 1}-${timeKenya_ .getDate()}`;
        break;
      case 'month':
        formattedTime = `${timeKenya_ .getFullYear()}-${timeKenya_ .getMonth() + 1}`;
        break;
      case 'year':
        formattedTime = `${timeKenya_ .getFullYear()}`;
        break;
      default:
        formattedTime = timeKenya_ .toISOString();
    }

    // Initialize aggregation for this time period if not already present
    if (!aggregated[formattedTime]) {
      aggregated[formattedTime] = {
        totalWatts: 0,
        totalVolt: 0,
        totalCurrent: 0,
        totalWatthours: 0,  // New field for total Watthours
        maxWatts: -Infinity, // Track max watts
        minWatts: Infinity,  // Track min watts
        maxVolt: -Infinity,  // Track max volt
        minVolt: Infinity,   // Track min volt
        maxCurrent: -Infinity, // Track max current
        minCurrent: Infinity,  // Track min current
        count: 0,  // Number of entries in this period
        index: index++,  // Increment the index for each aggregation period
        durationInSeconds: 0,  // Duration in seconds (calculated as the difference between consecutive readings)
        currentTime: timeKenya.toISOString(), // Set currentTime to the adjusted Kenya time (UTC+3)
      };
    }

    // Calculate the time difference from the previous item (in seconds)
    if (previousItem) {
      const currentTime = timeKenya.getTime() / 1000; // Convert to seconds in Kenya Time
      const previousTime = new Date(previousItem.updateTime).getTime() / 1000; // Previous item time in seconds (already adjusted to Kenya Time)
      const durationInSeconds = currentTime - previousTime; // Time difference in seconds
     
      // Accumulate data for the specific time period
      aggregated[formattedTime].totalWatts += item.watts;
      aggregated[formattedTime].totalVolt += item.volt;
      aggregated[formattedTime].totalCurrent += item.current;
      aggregated[formattedTime].totalWatthours += item.watts * durationInSeconds / 3600; // Add Watthours
      aggregated[formattedTime].maxWatts = Math.max(aggregated[formattedTime].maxWatts, item.watts);
      aggregated[formattedTime].minWatts = Math.min(aggregated[formattedTime].minWatts, item.watts);
      aggregated[formattedTime].maxVolt = Math.max(aggregated[formattedTime].maxVolt, item.volt);
      aggregated[formattedTime].minVolt = Math.min(aggregated[formattedTime].minVolt, item.volt);
      aggregated[formattedTime].maxCurrent = Math.max(aggregated[formattedTime].maxCurrent, item.current);
      aggregated[formattedTime].minCurrent = Math.min(aggregated[formattedTime].minCurrent, item.current);
      aggregated[formattedTime].count += 1;
      aggregated[formattedTime].durationInSeconds += durationInSeconds; // Add the duration in seconds
    }

    // Set the current item as the previous item for the next iteration
    previousItem = item;
  });

  // Calculate average for each aggregated time period
  const result = Object.keys(aggregated).map(timePeriod => {
    const data = aggregated[timePeriod];
    return {
      index: data.index,
      time: timePeriod,
      volt: data.totalVolt / data.count,
      current: data.totalCurrent / data.count,
      watts: data.totalWatts / data.count,
      watthours: data.totalWatthours,
      maxWatts: data.maxWatts,
      minWatts: data.minWatts,
      maxVolt: data.maxVolt,
      minVolt: data.minVolt,
      maxCurrent: data.maxCurrent,
      minCurrent: data.minCurrent,
      count: data.count, // Number of records in this period
      durationInSeconds: data.durationInSeconds, // Time duration for this period
      currentTime: data.currentTime, // Most recent time in the aggregation period
    };
  });

  return result;
}
