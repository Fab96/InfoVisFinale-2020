//seleziono l'elemento svg
var svg = d3.select("svg"),
width = +svg.attr("width"),
height = +svg.attr("height")
//creo mappa temporanea
var tmp = d3.map();

// Map and projection
var path = d3.geoPath();
//utilizzo la proiezione Mercatore
var projection = d3.geoMercator()
.scale(70)
.center([0,20])
.translate([width / 2, height / 2]);

//utilizzo una scala Threshold https://github.com/d3/d3-scale/blob/master/README.md#threshold-scales
var colorScale = d3.scaleThreshold();

// Load external data and boot
//funzione queue non esiste in più in d3 v5, importato libreria in index
//necessario per caricare la mappa vuota (nera) inizialmente altrimenti l'utente non vederebbe niente
d3.queue()
.defer(function f(callback) {
	d3.json("https://raw.githubusercontent.com/Fab96/InfoVisFinale-2020/master/world.geojson").then(function(file) {
		callback(null, file)
	})
})
.await(ready)


// Data and color scale
var data = d3.map();
colorScale = d3.scaleThreshold()
//imposto il dominio, ovvero il RTT in ms
.domain([10, 20, 30, 50, 70, 100,150,200])
//imposto il range su una scala di blu
.range(d3.schemeBlues[9]);


//creazione mappa
function creamappa(mappa) {

// Load external data and boot
d3.queue()
.defer(function f(callback) {
	d3.json("https://raw.githubusercontent.com/Fab96/InfoVisFinale-2020/master/world.geojson").then(function(file) {
		callback(null, file)
	})
}) 
//ora devo anche popolare la mappa
.defer(popola,mappa,data)
.await(ready)
}

//popolo la mappa
function popola(mappa,data,callback) {
	
	for (var i =0; i<mappa.length; i++) {
  	//esclude l'Italia (perchè origine) e valori RTT non validi (-1)
  	if (mappa[i].code.localeCompare("IT") !=0 && mappa[i].rtt !=-1) {
  		//set tmp ha il code del paese
  		if (tmp.has(mappa[i].code)) {
  			//tmp<code,[vecchio rtt + nuovo rtt,numero attuale record per quel code +1]>
  			tmp.set(mappa[i].code,[(tmp.get(mappa[i].code))[0]+mappa[i].rtt,(tmp.get(mappa[i].code))[1]+1]);
  		}
  		else 
  			//se tmp non ha il code del paese => tmp<code,[rtt,1(per la media degli rtt)]>
  			tmp.set(mappa[i].code,[mappa[i].rtt,1]);

  	}
  	

  }
  //calcolare la media del rtt per ciascun paese
  for (var i = 0; i<tmp.keys().length; i++) {
  	key = tmp.keys()[i];
  	//data<code,media rtt per paese>
  	data.set(key,(tmp.get(key))[0]/(tmp.get(key))[1]);
  }

  callback(null);

}

function ready(error, topo) {
  // Draw the map
  svg.append("g")
  .selectAll("path")
  .data(topo.features)
  .enter()
  .append("path")
      // draw each country
      .attr("d", d3.geoPath()
      	.projection(projection)
      	)
      // set the color of each country
      .attr("fill", function (d) {
      	//l'Italia come origine in grigio
      	if ((d.id).localeCompare("IT")==0) {
      		return "#a8a3a3";
      	}        

      	d.total = data.get(d.id);        
      	return colorScale(d.total);
      });
  }
