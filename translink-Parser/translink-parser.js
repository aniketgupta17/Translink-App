/**
 * Imports necessary modules for the code and initializes global variables availaible for the downloaded modules.
 */

import promptSync from "prompt-sync";
import { main as retrieveApiData } from "./realtime.js";
import { getStaticData, stop_id_uq } from "./static.js";
const prompt = promptSync();

const TRIES = 5;
let calendar, routes, stopTimes, trips, tripUpdates, vehiclePositions, alerts;

/**
 * Main function which starts the UQ Lakes bus tracking.
 * @param {boolean} welcome - This shows if the welcome message should be displayed .
 */

async function main(welcome = true) {
  if (welcome) {
    console.log("Welcome to the UQ Lakes station bus tracker!");
  }

  // extract necessary infos from the user
  let date = await extractDate();
  let time = await extractTime();
  let route = await extractBusRoute();

  let filteredStaticData = filterStaticData(date, time);
  let output = incorporateApiData(filteredStaticData, route);

  console.table(output);

  if (await getAgain()) {
    await main(false);
  } else {
    console.log("Thanks for using the UQ Lakes Station bus tracker!");
    process.exit(0);
  }
}

/**
 * Getting  prompt phrase .
 * @param {string} action - The action to get the prompt phrase.
 * @returns {string} The prompt phrase.
 */

function getPromptPhrase(action) {
  const phrase =
    action === "again"
      ? "Would you like to search again?"
      : action === "bus"
      ? "What Bus Route would you like to take? "
      : `What ${action} will you depart UQ Lakes station by bus? `;

  return phrase;
}

/**
 * Take the input date from user using this function .
 * @param {number} tries - The total number of tries that are taken to enter a valid date.
 * @param {string} previous - The previous date we get from the user.
 * @returns {Date} The date we get from the user.
 */

async function extractDate(tries = 0, previous = "") {
  if (tries) {
    console.log(`    "${previous}" is not a valid date.`);

    if (tries === TRIES) {
      console.log("    You failed to enter a valid date.");
      process.exit(1);
    } else {
      console.log("    Please enter a date in YYYY-MM-DD format.");
    }
  }
  let date = prompt(getPromptPhrase("date"));

  if (
    /\d{4}-\d{2}-\d{2}/.test(date) &&
    new Date(date).toString() != "Invalid Date"
  ) {
    return new Date(date);
  }

  return await extractDate(++tries, date);
}

/**
 * Take the bus route as an input from the user.
 * @param {number} tries - The number of tries to get the bus route .
 * @returns {string} The bus route taken from the user .
 */

async function extractBusRoute(tries = 0) {
  if (tries === TRIES) {
    console.log("    You failed to enter a valid bus route.");
    process.exit(1);
  } else if (tries) {
    console.log("    Please enter a bus route.");
  }

  let route = prompt(getPromptPhrase("bus"));

  if (route.toLowerCase() === "show all routes") {
    return route;
  }
  const filteredRoutes = routes.map((r) => r.route_id.split("-")[0]);
  const routeExists = filteredRoutes.some((id) => id === route);
  if (routeExists) {
    return route;
  }
  return await extractBusRoute(++tries);
}

/**
 * Take the real bus time from the user.
 * @param {number} tries - tries taken to input a valid time.
 * @param {string} previous - previos input given by user for time .
 * @returns {Object} The object for the hour and the minute  .
 */

async function extractTime(tries = 0, previous = "") {
  function validateTime(time) {
    // checking the format
    let validateTimeFormat = (time) => /^\d{2}:\d{2}$/.test(time);

    // validating all the date components
    function validateTimeComponents(components) {
      let integerComponents = components.map((component) =>
        parseInt(component)
      );
      let [hour, minute] = integerComponents;
      return hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59;
    }

    return validateTimeFormat(time) && validateTimeComponents(time.split(":"));
  }

  if (tries) {
    console.log(`"${previous}" is not a valid time.`);

    if (tries === TRIES) {
      console.log("You failed to enter a valid time.");
      process.exit(1);
    } else {
      console.log("Please enter a time in HH:mm format.");
    }
  }
  let time = prompt(getPromptPhrase("time"));

  if (validateTime(time)) {
    return {
      hour: parseInt(time.substring(0, 2)),
      minute: parseInt(time.substring(3)),
    };
  }

  return await extractTime(++tries, time);
}

/**
 * Filtering the static data on the basis of  date and time.
 * @param {Date} date - The selected date from the user .
 * @param {Object} time - An object which  contains hour and minute.
 * @returns {Object[]} An array for the filtered static data.
 */

function filterStaticData(date, time) {
  function parseTime(time) {
    return {
      hour: parseInt(time.substring(0, 2)),
      minute: parseInt(time.substring(3, 5)),
    };
  }

  // Returns the number of minutes elapsing while between `userTime` to `stopTime`

  function timeDiff(userTime, stopTime) {
    return (
      (stopTime.hour - userTime.hour) * 60 + (stopTime.minute - userTime.minute)
    );
  }

  let filteredServiceIds;
  switch (date.getDay()) {
    case 0:
      filteredServiceIds = calendar
        .filter((calendarEntry) => calendarEntry.sunday)
        .map((calendarEntry) => calendarEntry.service_id);
      break;
    case 1:
      filteredServiceIds = calendar
        .filter((calendarEntry) => calendarEntry.monday)
        .map((calendarEntry) => calendarEntry.service_id);
      break;
    case 2:
      filteredServiceIds = calendar
        .filter((calendarEntry) => calendarEntry.tuesday)
        .map((calendarEntry) => calendarEntry.service_id);
      break;
    case 3:
      filteredServiceIds = calendar
        .filter((calendarEntry) => calendarEntry.wednesday)
        .map((calendarEntry) => calendarEntry.service_id);
      break;
    case 4:
      filteredServiceIds = calendar
        .filter((calendarEntry) => calendarEntry.thursday)
        .map((calendarEntry) => calendarEntry.service_id);
      break;
    case 5:
      filteredServiceIds = calendar
        .filter((calendarEntry) => calendarEntry.friday)
        .map((calendarEntry) => calendarEntry.service_id);
      break;
    case 6:
      filteredServiceIds = calendar
        .filter((calendarEntry) => calendarEntry.saturday)
        .map((calendarEntry) => calendarEntry.service_id);
      break;
    default:
      throw new Error("Invalid date.");
  }

  let filteredTrips = trips.filter((trip) =>
    filteredServiceIds.includes(trip.service_id)
  );
  let filteredTripIds = filteredTrips.map((trip) => trip.trip_id);
  let filteredRouteIds = filteredTrips.map((trip) => trip.route_id);
  let filteredRoutes = routes.filter((route) =>
    filteredRouteIds.includes(route.route_id)
  );

  let filteredStopTimes = stopTimes
    .filter((stopTime) => filteredTripIds.includes(stopTime.trip_id))
    .filter((stopTime) => {
      // if terminates here, stop, don't suggest it
      if (!stopTime.departure_time) return false;

      // use the arrival time if it is already in the transit
      if (stopTime.arrival_time) {
        let arrivalTime = parseTime(stopTime.arrival_time);
        let diff = timeDiff(time, arrivalTime);
        return diff >= 0 && diff <= 10;
      }

      // use the departure time if the bus starts here
      let departureTime = parseTime(stopTime.departure_time);
      let diff = timeDiff(time, departureTime);
      return diff >= 0 && diff <= 10;
    });

  let result = [];

  for (let stop of filteredStopTimes) {
    if (!stop.arrival_time) continue;

    let trip = filteredTrips.find((trip) => trip.trip_id === stop.trip_id);
    if (
      !(
        trip?.route_id &&
        trip?.service_id &&
        trip?.trip_headsign &&
        trip?.trip_id
      )
    )
      continue;

    let route = filteredRoutes.find(
      (route) => trip && route.route_id === trip.route_id
    );
    if (!(route?.route_short_name && route?.route_long_name)) continue;

    result.push({
      routeShortName: route.route_short_name,
      routeLongName: route.route_long_name,
      serviceId: trip.service_id,
      tripId: trip.trip_id,
      headsign: trip.trip_headsign,
      scheduledArrivalTime: parseTime(stop.arrival_time),
    });
  }

  // sorting is done by time 
  result.sort(
    (a, b) => a.scheduledArrivalTime.minute - b.scheduledArrivalTime.minute
  );
  result.sort(
    (a, b) => a.scheduledArrivalTime.hour - b.scheduledArrivalTime.hour
  );

  return result;
}

/**
 * Incorporate real-time API data into the above static data which is filtered.
 * @param {Object[]} filteredStaticData - The  static data which is filtered.
 * @param {string} routeName - The route of the bus selected by the user .
 * @returns {Object[]} A dataset containing up-to-the-minute data.
 */

function incorporateApiData(filteredStaticData, routeName) {
  return filteredStaticData
    .map((arrival) => {
      let tripUpdate = tripUpdates.find(
        (tripUpdate) => tripUpdate.trip.tripId === arrival.tripId
      );
      let arrivalTime = undefined;
      if (tripUpdate?.stopTimeUpdate) {
        let stopTimeUpdate = tripUpdate.stopTimeUpdate.find(
          (update) => update.stopId === stop_id_uq
        );
        if (stopTimeUpdate?.arrival?.time) {
          arrivalTime = new Date(parseInt(stopTimeUpdate.arrival.time));
        }
      }

      let vehiclePosition = vehiclePositions.find(
        (position) => position?.trip?.tripId === arrival.tripId
      );

      return {
        ...arrival,
        liveArrivalTime: !arrivalTime
          ? null
          : {
              hour: arrivalTime.getHours(),
              minute: arrivalTime.getMinutes(),
            },
        livePosition: !vehiclePosition
          ? null
          : {
              latitude: vehiclePosition?.position?.latitude,
              longitude: vehiclePosition?.position?.longitude,
            },
      };
    })
    .map((arrival) =>
      //Th elive time of arrival is stringified
      ({
        ...arrival,
        scheduledArrivalTime: `${arrival.scheduledArrivalTime.hour}:${arrival.scheduledArrivalTime.minute}`,
        // O.T: On Time
        liveArrivalTime: !arrival.liveArrivalTime
          ? "On Time"
          : `${arrival.liveArrivalTime.hour}:${arrival.liveArrivalTime.minute}`,
        livePosition: !arrival.livePosition
          ? "n/a"
          : `${arrival.livePosition.latitude}, ${arrival.livePosition.longitude}`,
      })
    )
    .filter((arrival) => {
      if (routeName.toLowerCase() === "show all routes") return true;
      return arrival.routeShortName === routeName;
    })
    .map((arrival) =>
      // Better Output Display by stringifying the property names 
      ({
        "Route Short Name": arrival.routeShortName,
        "Route Long Name": arrival.routeLongName,
        "Service ID": arrival.serviceId,
        Headsign: arrival.headsign,
        "Arrival Time": arrival.liveArrivalTime,
        "Live Position": arrival.livePosition,
      })
    );
}

/**
 * Tell the user to search again in the bus tracker or exit.
 * @param {number} tries - The number of tries taken by the user to enter valid response.
 * @param {string} previous - The previous user input for the above response.
 * @returns {boolean} True if the user searches again and false to exit the tracker.
 */

async function getAgain(tries = 0, previous = "") {
  if (tries) {
    console.log(`    "${previous}" is not a valid response.`);

    if (tries === TRIES) {
      console.log("    You failed to enter a valid response.");
      process.exit(1);
    } else {
      console.log("    Please enter 'y', 'yes', 'n' or 'no'.");
    }
  }

  let again = prompt(getPromptPhrase("again"));

  if (/^(y|yes)$/.test(again.toLowerCase())) {
    return true;
  } else if (/^(n|no)$/.test(again.toLowerCase())) {
    return false;
  }

  return getAgain(++tries, again);
}

/**
 * Start the application for showing results in the terminal .
 */

(async () => {
  const staticData = await getStaticData();
  ({ stopTimes, trips, calendar, routes } = staticData);

  const routeIds = routes.map((route) => route.route_id);

  // the data is being retrieved 
  const apiData = await retrieveApiData(routeIds);
  [alerts, tripUpdates, vehiclePositions] = apiData;

  // the real time data is being updated in every 5 * 60 * 1000 milliseconds
  setInterval(async () => {
    const apiData = await retrieveApiData(routeIds);
    [alerts, tripUpdates, vehiclePositions] = apiData;
  }, 300000);

  await main();
})();
