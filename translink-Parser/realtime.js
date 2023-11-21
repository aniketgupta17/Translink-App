import fetch from "node-fetch";
import fs from "fs";

const API = "http://127.0.0.1:5343/gtfs/seq/";

async function fetchApi(routeIds) {
  async function getAlerts(routeIds) {
    function extractAlerts(alerts) {
      return alerts.map((alert) => alert.alert);
    }

    function filterAlerts(alerts, routeIds) {
      return alerts.filter((alert) => {
        let alertRouteIds = alert.informedEntity.map(
          (entity) => entity.routeId
        );
        return routeIds.some((routeId) => alertRouteIds.includes(routeId));
      });
    }
    // fetch realtime alerts
    let response = await fetch(API + "alerts.json");
    let buffer = await response.arrayBuffer();
    let decoded = new TextDecoder().decode(buffer);
    let entity = JSON.parse(decoded).entity;
    let alerts = extractAlerts(entity);

    return filterAlerts(alerts, routeIds);
  }

  async function getTripUpdates(routeIds) {
    function extractTripUpdates(tripUpdates) {
      return tripUpdates.map((tripUpdate) => tripUpdate.tripUpdate);
    }

    function filterTripUpdates(tripUpdates, routeIds) {
      return tripUpdates.filter(
        (tripUpdate) =>
          tripUpdate.trip.routeId && routeIds.includes(tripUpdate.trip.routeId)
      );
    }
    // fetch trip updates
    let response = await fetch(API + "trip_updates.json");
    let buffer = await response.arrayBuffer();
    let decoded = new TextDecoder().decode(buffer);
    let entity = JSON.parse(decoded).entity;
    let tripUpdates = extractTripUpdates(entity);

    return filterTripUpdates(tripUpdates, routeIds);
  }

  async function getVehiclePositions(routeIds) {
    function extractVehiclePositions(vehiclePositions) {
      return vehiclePositions.map((vehiclePosition) => vehiclePosition.vehicle);
    }

    function filterVehiclePositions(vehiclePositions, routeIds) {
      return vehiclePositions.filter(
        (vehiclePosition) =>
          vehiclePosition.trip?.routeId &&
          routeIds.includes(vehiclePosition.trip?.routeId)
      );
    }
    // fetch positions
    let response = await fetch(API + "vehicle_positions.json");
    let buffer = await response.arrayBuffer();
    let decoded = new TextDecoder().decode(buffer);
    let entity = JSON.parse(decoded).entity;
    let vehiclePositions = extractVehiclePositions(entity);

    return filterVehiclePositions(vehiclePositions, routeIds);
  }

  const alerts = await getAlerts(routeIds);
  const tripUpdates = await getTripUpdates(routeIds);
  const vehiclePositions = await getVehiclePositions(routeIds);

  return [alerts, tripUpdates, vehiclePositions];
}

async function assignApiData(alerts, tripUpdates, vehiclePositions) {
  const logError = (error) => {
    if (error) console.log(error);
  };

  async function assignApiDataHelper(filename, entity) {
    fs.writeFile(
      `cached-data/${filename}.json`,
      JSON.stringify(entity, null, 4),
      logError
    );
  }

  await assignApiDataHelper("alerts", alerts);
  await assignApiDataHelper("trip_updates", tripUpdates);
  await assignApiDataHelper("vehicle_positions", vehiclePositions);
}

export async function main(routeIds) {
  const data = await fetchApi(routeIds);
  const [alerts, tripUpdates, vehiclePositions] = data;
  assignApiData(alerts, tripUpdates, vehiclePositions);

  return [alerts, tripUpdates, vehiclePositions];
}
