import { useState, useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvent } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import 'react-leaflet-markercluster/styles';
import "leaflet-geosearch/assets/css/leaflet.css";
import { PieChart, Pie, Sector, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import MarkerClusterGroup from "react-leaflet-markercluster";
import { GeoSearchControl, OpenStreetMapProvider, MapBoxProvider } from 'leaflet-geosearch';
import {Icon} from 'leaflet';


const fetchData = async () => {
  try {
    const response = await fetch("/aggregates.json"); // Charger le fichier JSON
    if (!response.ok) throw new Error("Erreur de chargement du fichier JSON");
    return await response.json();
  } catch (error) {
    console.error("Erreur lors du chargement des données:", error);
    return {};
  }
};
const chargerIcon = new Icon ({
    iconUrl : './chargeMarker3.png',
    iconSize : [40, 40], // size of the icon
    iconAnchor : [15, 40], // point of the icon which will correspond to marker's location
    popupAnchor : [10, -40] // point from which the popup should open relative to the iconAnchor
  });

const selectChargerIcon = new Icon ({
  iconUrl : './chargeMarker4.png',
  iconSize : [40, 40], // size of the icon
  iconAnchor : [15, 40], // point of the icon which will correspond to marker's location
  popupAnchor : [10, -40] // point from which the popup should open relative to the iconAnchor
});

const daysOfWeek = [
  "Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"
];

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="custom-tooltip  bg-white shadow-md p-4 rounded-lg">
        <p className="label">{`Occupation moyenne à ${label}h :  ${Math.round(payload[0].value)}%`}</p>
      </div>
    );
  }

  return null;
};

export default function PDCDashboard() {
  const [stations, setStations] = useState([]);
  const [selectedStation, setSelectedStation] = useState(null);
  const [selectedDay, setSelectedDay] = useState(new Date().getDay());  
  const [map, setMap] = useState(null)
  const STATUS_ENUM = {
    "Inconnu": 0,
    "AVAILABLE": 1,
    "Disponible": 1,
    "Occupé (en charge)": 2,
    "OCCUPIED": 2,
    "En maintenance": 10,
    "Mise en service planifiée": 20,
};
  const statusLabel = {
    0 : "Inconnu",
    1 : "Disponible",
    2 : "Occupé (en charge)",
    10 : "En maintenance"
  };
  const COLORS = ['#00C49F','#FF8042','#0088FE',   '#FFBB28'];
  const COLORS_DARKER = ['#007D66','#9E5029','#004E91',   '#A67A1B'];

  const SearchField = ({ apiKey }) => {
    const geoProvider = new OpenStreetMapProvider({
      params:{
        countrycodes: 'fr',
      }});
      
    // @ts-ignore
    const searchControl = new GeoSearchControl({
      provider: geoProvider,
      style: 'button',
      showMarker: false,
      autoComplete: true, // optional: true|false  - default true
      autoCompleteDelay: 250, // optional: number      - default 250
      marker: {
        // optional: L.Marker    - default L.Icon.Default
        icon: new L.Icon.Default(),
        draggable: false,
      },
    });
  
    const map = useMap();
    useEffect(() => {
      map.addControl(searchControl);
      return () => map.removeControl(searchControl);
    }, []);
  
    return null;
  };

  function SetViewOnClick({ animateRef }) {
    const map = useMapEvent('click', (e) => {
      map.setView(e.latlng, map.getZoom(), {
        animate: true,
      });
      setSelectedStation(null);
    })
  
    return null
  }

  const getBarColor = function(rate){
    const startColor = [143, 82, 37];
    const endColor = [0, 100, 42];
    //let colorMult = 1 - rate / (duration * 1000);
    let colorH = startColor[0] + (endColor[0] - startColor[0]) * rate/100;
    let colorS = startColor[1] + (endColor[1] - startColor[1]) * rate/100;
    let colorL = startColor[2] + (endColor[2] - startColor[2]) * rate/100;
    // console.log(rate)
    /*return colorH.toString(16)+
      colorS.toString(16)+
      colorL.toString(16);*/
    return `hsl(${colorH.toFixed(2)}, ${colorS.toFixed(2)}%, ${colorL.toFixed(2)}%)`;
    //return "#903030";
  }
  const getDurationDisplayString = function(duration) {
    let hours = Math.floor(parseInt(duration) / 3600);
    let minutes = Math.floor((parseInt(duration) % 3600) / 60);
    let seconds = Math.floor(parseInt(duration) % 60);
    return `${hours.toString().padStart(2, "0")}h${minutes
      .toString()
      .padStart(2, "0")}min`;
  }

  const RADIAN = Math.PI / 180;
  let repartition_status_par_jourArray;
  if(selectedStation && typeof selectedDay != "undefined" && selectedStation.repartition_status_par_jour[selectedDay])
    repartition_status_par_jourArray = Object.entries(selectedStation.repartition_status_par_jour[selectedDay]).map(v => ({name:v[0].toString(),value:parseInt(v[1])}));
  const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, index }) => {
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
    //console.log("index ? ", index, repartition_status_par_jourArray);
    const val = repartition_status_par_jourArray[index].name;
    //const val = index;
    //console.log("index ? ", index , "val ?" , val);
    const label = statusLabel[ val ] ? statusLabel[ val ] : "Incconu";
    return (
      <>
      <text x={x} y={y} fill="black" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central">
        {`${label}`}
      </text>
      <text x={x} y={y + 20} fill={COLORS_DARKER[index % COLORS_DARKER.length]} textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central">
        {`${(percent * 100).toFixed(0)}%`}
      </text>
      </>
    );
  };
  useEffect(() => {
    fetchData().then((data) => setStations(Object.values(data)));
  }, []);
  // if(selectedStation && selectedDay)
  //   console.log(Object.entries(selectedStation.repartition_status_par_jour[selectedDay]));
  // Object.entries(selectedStation.repartition_status_par_jour[selectedDay]).map((entry, index) => (
  //   console.log(`${entry} cell-${index} ${COLORS[index % COLORS.length]}`)
  // ))
  return (
    <div className="h-screen">
      <div className="h-full">

      <div className={`fixed top-3 left-20 z-600 w-1/3 h-fit bg-white shadow-md rounded-lg overflow-y-auto text-black hidden sm:block`}>      
          <div className="bg-white-800 rounded-lg rounded-b-none p-4">
              <h2 class="text-sg font-bold tracking-tight text-gray-900  text-gray ">Statistiques d'occupation des stations de recharge</h2>
          </div>
      </div>
        <MapContainer center={[48.8566, 2.3522]} zoom={12} className="h-full w-full rounded-lg shadow-lg" ref={setMap}>
          <TileLayer url="https://api.mapbox.com/styles/v1/mapbox/streets-v12/tiles/256/{z}/{x}/{y}@2x?access_token=sk.eyJ1Ijoic2FyYWhvcmJhbiIsImEiOiJjbHR3dXo0bGkwNDJ0MmtvZHo3M3llcWRuIn0.wYPyJx-3NpAWAO7msr2oEA"/>

          <MarkerClusterGroup showCoverageOnHover={false}>
          {stations.map((station) => (
            <Marker
              key={station.id_station}
              position={station.coordonnee ? [station.coordonnee.lat, station.coordonnee.lon] : [48.8566, 2.3522]}
              icon={station == selectedStation ?  selectChargerIcon : chargerIcon}
              eventHandlers={{
                click: () => {
                  setSelectedStation(station);
                  map.setView([station.coordonnee.lat, station.coordonnee.lon], map.getZoom(), {
                    animate: true,
                  })
                  
                },
              }}
            >
              <Popup>{station.adresse}<br/>
              {station.nombre_total_pdc ? (
                <>
                {station.nombre_total_pdc} borne{station.nombre_total_pdc > 1 ? "s":""}
                </>
              ) : ""}              
              </Popup>
              
            </Marker>
          ))}
          </MarkerClusterGroup>
          <SearchField/>
          <SetViewOnClick animateRef="true" />
        </MapContainer>
      </div>
      {selectedStation ? (
      <div className={`fixed sm:top-px left:2 sm:right-3 bottom-px z-600 w-full sm:w-1/3 h-1/2 sm:h-full bg-white shadow-md rounded-lg overflow-y-auto text-black`}>
          <div className={``}>
            <div className="bg-gray-800 rounded-lg rounded-b-none p-4">
              <h2 class="text-lg font-bold tracking-tight text-gray-900  text-white ">{selectedStation.adresse.replace(/,/,', ')}</h2>
            </div>
              <div className="p-4">
  
              {(selectedStation.isInactive || selectedStation.nombre_total_pdc == 0) && <p className="inline-flex items-center rounded-md bg-red-50 px-2 py-1 text-xs font-medium text-red-700 ring-1 ring-red-600/10 ring-inset"> Cette station semble hors service</p>}
  
              <dl className="divide-y divide-gray-100">
                <div className="px-4 py-1 grid grid-cols-2 gap-4 px-0">
                  <dt className="text-sm/6 font-medium text-gray-900">Ville</dt>
                  <dd className="mt-1 text-sm/6 text-gray-700 sm:mt-0">{selectedStation.ville}</dd>
                </div>

              {selectedStation.arrondissement && selectedStation.arrondissement != 99 ? 
              <div className="px-4 py-1 grid grid-cols-2 gap-5 px-0">
                <dt className="text-sm/6 font-medium text-gray-900">Arrondissement</dt>
                <dd className="mt-1 text-sm/6 text-gray-700 sm:mt-0">{selectedStation.arrondissement}</dd>
              </div>
               : <span></span>
              }
              <div className="px-4 py-1 grid grid-cols-2 gap-4 px-0">
                <dt className="text-xs/6 font-medium text-gray-900">Nombre de bornes : </dt>
                <dd className="mt-1 text-sm/6 text-gray-700 sm:mt-0"><span className="inline-flex items-center rounded-md bg-yellow-50 px-2 py-1 text-xs font-medium text-yellow-800 ring-1 ring-yellow-600/20 ring-inset">{selectedStation.nombre_total_pdc}</span></dd>
              </div>
              {selectedStation.temps_moyen_occupation && 
              <div className="px-4 py-1 grid grid-cols-2 gap-4 px-0">
                <dt className="text-xs/6 font-medium text-gray-900">Temps d'occupation moyen: </dt>
                <dd className="mt-1 text-sm/6 text-gray-700 sm:mt-0"><span className="inline-flex items-center rounded-md bg-purple-50 px-2 py-1 text-xs font-medium text-purple-800 ring-1 ring-purple-600/20 ring-inset">{getDurationDisplayString(parseInt(selectedStation.temps_moyen_occupation))}</span></dd>
              </div>
              }

              </dl>
              <h3 className="text-md font-semibold mt-4">Taux d'occupation global par heure</h3>
              {selectedStation.taux_occupation_par_heure ? (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart
                    data={Object.entries(selectedStation.taux_occupation_par_heure || {}).map(([hour, rate]) => ({ hour, rate }))}
                  >
                    <XAxis dataKey="hour" />
                    <YAxis  domain={[0, 100]}/>
                    <Tooltip content={<CustomTooltip/>}/>
                    <Bar dataKey="rate" fill="#88d4d8">{Object.entries(selectedStation.taux_occupation_par_heure || {}).map(([hour, rate]) => (<Cell fill={getBarColor(rate)}/>))}</Bar>
                  </BarChart>
  
                </ResponsiveContainer>
              ) : (
                <p className="text-gray-500">Données non disponibles</p>
              )}
  
            <select
                id="daySelector"
                className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500w-full bg-transparent placeholder:text-slate-400 text-slate-700 text-sm border border-slate-200 rounded pl-3 pr-8 py-1 transition duration-300 ease focus:outline-none focus:border-slate-400 hover:border-slate-400 shadow-sm focus:shadow-md appearance-none cursor-pointer"
                value={selectedDay}
                onChange={(e) => setSelectedDay(parseInt(e.target.value, 10))}
              >
                {daysOfWeek.map((day, index) => (
                  <option key={index} value={index}>{day}</option>
                ))}
              </select>
              <h3 className="text-md font-semibold mt-4">Le {daysOfWeek[selectedDay]}</h3>
                {selectedStation.taux_occupation_par_heure_jour && selectedStation.taux_occupation_par_heure_jour[selectedDay] ? (
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart
                      data={Object.entries(selectedStation.taux_occupation_par_heure_jour[selectedDay] || {}).map(([hour, rate]) => ({ hour, rate }))}
                    >
                      <XAxis dataKey="hour" />
                      <YAxis domain={[0, 100]}/>
                      <Tooltip content={<CustomTooltip/>}/>
                      <Bar dataKey="rate" fill="#88d4d8">{Object.entries(selectedStation.taux_occupation_par_heure_jour[selectedDay] || {}).map(([hour, rate]) => (<Cell fill={getBarColor(rate)}/>))}</Bar>
                  </BarChart>
  
                    <h3 className="text-md font-semibold mt-4">Répartition du taux d'occupation le {daysOfWeek[selectedDay]}</h3>
                    <PieChart width={400} height={400}>
                    <Pie
                      data={Object.entries(selectedStation.repartition_status_par_jour[selectedDay]).map(v => ({name:v[0].toString(),value:parseInt(v[1])}))}
                      //data={fakedata}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={renderCustomizedLabel}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {Object.entries(selectedStation.repartition_status_par_jour[selectedDay]).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    </PieChart>
  
                  </ResponsiveContainer>
                ) : (
                  <p className="text-gray-500">Données non disponibles pour ce jour.</p>
                )}
              </div>


            </div>
      </div>
        ) : (
          <div className="col-span-1 bg-white shadow-md rounded-lg overflow-y-auto text-black"></div>
    )}
    </div>
  );
}
