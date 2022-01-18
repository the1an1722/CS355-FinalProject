const fs = require('fs');
const http = require('http');
const https = require('https');

const port = 3000;

const server = http.createServer();
server.on("request", request_handler);
server.on("listening", listen_handler);
server.listen(port);

function listen_handler(){
	console.log(`Now Listening on Port ${port}`);
}
function request_handler(req, res){
    console.log(req.url);
    if(req.url === "/"){
        const form = fs.createReadStream("html/index.html");
		res.writeHead(200, {"Content-Type": "text/html"})
		form.pipe(res);
    }
    else if(req.url.startsWith("/search")){
        const user_input = new URL(req.url, `https://${req.headers.host}`).searchParams;

		const zipcode = user_input.get('zipcode');

		res.writeHead(200, {"Content-Type": "text/html"});
		get_zipCodes(zipcode, res);
    }
    else{
        res.writeHead(404, {"Content-Type": "text/html"});
        res.end("<h1>Not Found</h1>");    
    }
}
function get_zipCodes(zipcode, res){

	
	const location_endpoint = `https://www.zipcodeapi.com/rest/XdqNwL0B7wMxlYDssISEfHRNuF1jdWUazLwdPZsA828V8gzMPCMUwQUkXlen1Gxn/info.json/${zipcode}/degrees`;
	const location_request = https.request(location_endpoint, {method:"GET"});

	let options = {tasks_completed: 0};     //forcing pass by reference
	location_request.once("response", stream => process_stream(stream, parse_location, options, res));
    
	location_request.end();
	//setTimeout(()=>location_request.end() , 5000);		// Adds 5s delay swap out line above this
}

function get_weather(cityName, options, res){
	const weather_endpoint = `https://api.openweathermap.org/data/2.5/weather?q=${cityName}&appid=17e9fd7ebb323326990ca10d41f64afc`;
	const weather_request = https.request(weather_endpoint);

	weather_request.once("response" , weather_res => process_stream(weather_res, parse_results, options, res));
	weather_request.end();
	
}


function process_stream (stream, callback , ...args){
	let body = "";
	stream.on("data", chunk => body += chunk);
	stream.on("end", () => callback(body, ...args));
}

function parse_location(word_data, options, res){
    const word_object = JSON.parse(word_data);
	let results = "<h1>No Results Found</h1>";
	console.log(word_object);
	if( word_object.city !== null && word_object.city !== ''){
		results = `<h1>Location infomation for current zipcode is:</h1>
		<div>Zipcode: ${word_object.zip_code}</div>
		<div>City: ${word_object.city}</div>
		<div>State: ${word_object.state}</div>`;
	}
	results = `<div style="width:49%;">${results}</div>`
    console.log(results);
	res.write(results.padEnd(1024," ") , () => get_weather(word_object.city,options,res));

}

function parse_results(data, options, res){
    const lookup = JSON.parse(data);
	let results = "<h1>No Results Found</h1>";
	console.log(lookup);
    if(Array.isArray(lookup.weather)){
        let main = lookup.weather[0]?.main;
        let description = lookup.weather[0]?.description;
		results = `<h1>The whether condifion for ${lookup?.name} shows below</h1>
		<div>weather: ${lookup?.weather[0]?.main}</div>
		<div>description: ${lookup?.weather[0]?.description}</div>
		<div>temperature: ${lookup?.main.temp}</div>`;
	}
	results = `<div style="width:49%;">${results}</div>`
	res.write(results.padEnd(1024," ") , () => terminate(options, res));
}
function terminate(options, res){
	options.tasks_completed++;
    console.log(options);
	if(options.tasks_completed === 1){
		res.end();
	}
}