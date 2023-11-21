import fs from "fs";
import { parse } from "csv-parse";
import events from "events";

export let stop_id_uq;

// Make even emitter limit large
events.EventEmitter.defaultMaxListeners = 3000000;

export async function getStaticData() {
  // get all stops from file, filter them and return
  async function getStops() {
    async function parseStops() {
      return new Promise((resolve, reject) => {
        const rows = [];
        const readStream = fs.createReadStream("static-data/stops.txt");

        readStream
          .pipe(parse({ delimiter: ",", columns: true }))
          .on("data", function (row) {
            rows.push(row);
          })
          .on("error", function (error) {
            reject(error);
          })
          .on("finish", () => {
            console.log("finished");
            resolve(rows);
          });
      });
    }

    function filterStops(stops) {
      return stops.filter(
        (stop) =>
          stop.stop_name &&
          /\.*UQ Lakes station\.*/.test(stop.stop_name) &&
          /\d/.test(stop.stop_id)
      );
    }

    let parsedStops = await parseStops();
    stop_id_uq = parsedStops[0]["stop_id"];

    return filterStops(parsedStops);
  }
  // get all stop times from file, filter them and return
  async function getStopTimes(stops) {
    async function parseStopTimes() {
      return new Promise((resolve, reject) => {
        const rows = [];
        const readStream = fs.createReadStream("static-data/stop_times.txt");

        readStream
          .pipe(parse({ delimiter: ",", columns: true }))
          .on("data", function (row) {
            rows.push(row);
          })
          .on("error", function (error) {
            reject(error);
          })
          .on("finish", () => {
            console.log("finished");
            resolve(rows);
          });
      });
    }

    async function filterStopTimes(stopTimes, stops) {
      let stopIds = stops.map((stop) => stop.stop_id);
      return stopTimes.filter((stopTime) => stopIds.includes(stopTime.stop_id));
    }

    let stopTimes = await parseStopTimes();
    let filteredStopTimes = await filterStopTimes(stopTimes, stops);
    return filteredStopTimes;
  }

  // get all trips info from file, filter them and return
  async function getTrips(stopTimes) {
    async function parseTrips() {
      return new Promise((resolve, reject) => {
        const rows = [];
        const readStream = fs.createReadStream("static-data/trips.txt");

        readStream
          .pipe(parse({ delimiter: ",", columns: true }))
          .on("data", function (row) {
            rows.push(row);
          })
          .on("error", function (error) {
            reject(error);
          })
          .on("finish", () => {
            console.log("finished");
            resolve(rows);
          });
      });
    }

    function filterTrips(trips, stopTimes) {
      let tripIds = stopTimes.map((stopTime) => stopTime.trip_id);
      return trips.filter((trip) => tripIds.includes(trip.trip_id));
    }

    let parsedTrips = await parseTrips();
    return filterTrips(parsedTrips, stopTimes);
  }

  // get all calendar dates from file, filter them and return
  async function getCalendarDates(trips) {
    async function parseCalendarDates() {
      return new Promise((resolve, reject) => {
        const rows = [];
        const readStream = fs.createReadStream(
          "static-data/calendar_dates.txt"
        );

        readStream
          .pipe(parse({ delimiter: ",", columns: true }))
          .on("data", function (row) {
            rows.push(row);
          })
          .on("error", function (error) {
            reject(error);
          })
          .on("finish", () => {
            console.log("finished");
            resolve(rows);
          });
      });
    }

    async function filterCalendarDates(calendarDates, trips) {
      let serviceIds = trips.map((trip) => trip.service_id);
      return calendarDates.filter((date) =>
        serviceIds.includes(date.service_id)
      );
    }

    let parsedCalendarDates = await parseCalendarDates();
    return filterCalendarDates(parsedCalendarDates, trips);
  }

  // get the calendar from file, filter them and return
  async function getCalendar(trips) {
    async function parseCalendar() {
      return new Promise((resolve, reject) => {
        const rows = [];
        const readStream = fs.createReadStream("static-data/calendar.txt");

        readStream
          .pipe(parse({ delimiter: ",", columns: true }))
          .on("data", function (row) {
            rows.push(row);
          })
          .on("error", function (error) {
            reject(error);
          })
          .on("finish", () => {
            console.log("finished");
            resolve(rows);
          });
      });
    }

    function filterCalendar(calendar, trips) {
      let serviceIds = trips.map((trip) => trip.service_id);
      return calendar.filter((service) =>
        serviceIds.includes(service.service_id)
      );
    }

    let parsedCalendar = await parseCalendar();
    return filterCalendar(parsedCalendar, trips);
  }
  // get all routes from file, filter them and return
  async function getRoutes(trips) {
    function parseRoutes() {
      return new Promise((resolve, reject) => {
        const rows = [];
        const readStream = fs.createReadStream("static-data/routes.txt");

        readStream
          .pipe(parse({ delimiter: ",", columns: true }))
          .on("data", function (row) {
            rows.push(row);
          })
          .on("error", function (error) {
            reject(error);
          })
          .on("finish", () => {
            console.log("finished");
            resolve(rows);
          });
      });
    }

    async function filterRoutes(routes, trips) {
      let routeIds = trips.map((trip) => trip.route_id);
      return routes.filter((route) => routeIds.includes(route.route_id));
    }

    let parsedRoutes = await parseRoutes();
    return filterRoutes(parsedRoutes, trips);
  }

  let stops = await getStops();
  let stopTimes = await getStopTimes(stops);
  let trips = await getTrips(stopTimes);
  let calendarDates = await getCalendarDates(trips);
  let calendar = await getCalendar(trips);
  let routes = await getRoutes(trips);

  return { stops, stopTimes, trips, calendarDates, calendar, routes };
}
