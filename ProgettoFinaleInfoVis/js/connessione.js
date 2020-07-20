//NB: Il servizio di geolocalizzazione dell'IP destinazione reperibile a ip-api.com permette di effettuare al massimo 45 richieste
//ogni minuto (per sicurezza sottodimensiono a 40 richieste al minuto)


// Create a connection
var socket = io("https://atlas-stream.ripe.net", { path : "/stream/socket.io" });
//contiene gli ip destinazione con associati i rtt
var dstaddrs = [];
//per gestire gli ip non inseriti in dstaddrs
var surplus = [];
// copia di dstaddrs
var copy;
//contiene ip destinazione con associati i rtt
var rows = [];

// Declare a callback to be executed when a measurement result is received
socket.on("atlas_result", function(result){
	//estraggo l'indirizzo destinazione di ciascuna misurazione
	var dstaddr = result["dst_addr"];
	//estraggo l'rtt medio di ciascuna misurazione
	var rtt = result["avg"];

 	//popolo l'array surplus
 	surplus.push({indirizzo:dstaddr, rtt:rtt});

 	if (dstaddrs.length<40 && surplus.length !=0 ) {
 	//popolo l'array dstaddrs
 	dstaddrs.push(surplus[0]);

 	//bisogna inviare le richieste 
 	if (dstaddrs.length == 40) {
 		copy = dstaddrs;
 		//la funzione verrà chiamata 60 secondi dopo
 		setTimeout(function() {
 			dstaddrs = [];
 			for (var i = 0; i < copy.length; i++) {
 				//effettuo la richiesta per l'iesimo indirizzo ip, in particolare il countryCode è nel formato ISO 3166-1 alpha-2
 				var endpoint = 'http://ip-api.com/json/'+copy[i].indirizzo+'?fields=status,message,country,query,countryCode';
 				//apro la richiesta http
 				var xhr = new XMLHttpRequest();
 				xhr.onreadystatechange = function() {
 					//se l'operazione è completata readyState = 4 e risposta http ok => continuo
 					if (this.readyState == 4 && this.status == 200) {
 						//ottengo la risposta del servizio di geolocalizzazione
 						var response = JSON.parse(this.responseText);
 						var rttf;
 						//se ci sono errori termino
 						if(response.status !== 'success') {
 							console.log('query failed: ' + response.message);
 							return
 						}
 						for (var i=0; i<copy.length; i++) {
 							//se l'ip presente in copy è lo stesso di quello fornito dal servizio di geolocalizzazione => memorizzo rtt
 							if (copy[i].indirizzo==response.query) {
 								rttf = copy[i].rtt; 
 							}
 						}
 						//alcuni Paesi nel file che descrive la mappa geografica sono contenuti in altri Paesi per semplicare, ad esempio Singapore è contenuto nella Malesia
 						//quindi converto il codice del Paese e inserisco la coppia countryCode, rtt in rows
 						if (response.countryCode.localeCompare("SG")==0)
 							rows.push({code:"MY",rtt:rttf});
 						//altrimenti inserisco semplicemente la coppia countryCode, rtt in rows
 						else
 							rows.push({code:response.countryCode,rtt:rttf});
 						if (rows.length == 40) {
 								//creo la mappa
 								creamappa(rows);
 								rows=[];
 							}
 					}
 					//facendo troppe richieste di geolocalizzazione
 					else if (this.status == 429) {
 						console.log(this.status);
 						console.log("Too many requests");
 					}
 				};
 				//inizializzo richiesta
 				xhr.open('GET', endpoint, true);
 				//spedisco la richiesta al server
 				xhr.send();
 			}

 		},60000);}
 		//elimino il primo elemento di surplus perchè inserito in dstaddrs
 		surplus.splice(0,1);
 	}


 });

// Subscribe to results coming from all the Italian probes 
socket.emit("atlas_subscribe", { stream_type: "result", type: "ping", prb: 21265});
socket.emit("atlas_subscribe", { stream_type: "result", type: "ping", prb: 31899});
socket.emit("atlas_subscribe", { stream_type: "result", type: "ping", prb: 21286});
socket.emit("atlas_subscribe", { stream_type: "result", type: "ping", prb: 19815});
socket.emit("atlas_subscribe", { stream_type: "result", type: "ping", prb: 22003});

