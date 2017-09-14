var express = require("express");

var services = require('./services.js');
var app = express();
var port = 6969;
app.use(express.static('public'))
app.set('views', __dirname + '/public');
// #buy BTC 0.0001
app.get("/", function(req, res){
    res.render('public');
});

var quere = [];
var amout_quere = [];
var vol_quere = [];
var curVol = [];
var store = [];
var buyInterval = [];
var sellInterval = [];
var io = require('socket.io').listen(app.listen(port));

function actionBuy(amout,i){
	amout_quere[i] = amout_quere[i] - amout;
	if(amout_quere[i] < 0.5){
		clearInterval(buyInterval[i]);
		quere.splice(i,1);
	}
}

function buy(type_BTC,bid,i){
	
	if(amout_quere[i] > 0.5){
		services.getticker( { market : "USDT-BTC" }, function( data, err ){
			curBtc = data.result.Last;
			var bitBtc = bid/curBtc;
			services.getorderbook({ market : type_BTC, depth : 0, type : 'sell' }, function( data, err ) {
			  var result = data.result;
			  for(j = 0 ; j < result.length; j++){
			  	if(result[j].Rate <= bitBtc){
			  		
			  		var amoutSpend = result[j].Quantity * result[j].Rate * curBtc;
			  		if(amoutSpend > amout_quere[i]){
				  		var message = "Da mua " + type_BTC + " Gia: "+ result[j].Rate+" Vol: "+ (amout_quere[i]/(result[j].Rate * curBtc));
					  		message = message + "<br/> So tien con lai trong quere " + i + " : 0 USD";
					  		io.sockets.emit('message',{message : message});
					  		actionBuy(amout_quere[i],i);
			  		} else {
				  		var message = "Da mua " + type_BTC + " Gia: "+ result[j].Rate+" Vol: "+ result[j].Quantity;
				  		message = message + "<br/> So tien con lai trong quere " + i + " : "+ (amout_quere[i] - amoutSpend) + " USD";
				  		io.sockets.emit('message',{message : message});
				  		actionBuy(amoutSpend,i);			  			
			  		}
			  		
			  		break;
			  	}
			  }
			});		
		});			
	} else {
		if (typeof buyInterval[i] !== 'undefined') {
		    clearInterval(buyInterval[i]);
		}
		
	}
	

}

function sell(type_BTC,bidUsd,i){
	if(vol_quere[i] > 0){
		var tmp = type_BTC.replace("BTC-","");
		services.getbalance({currency : tmp},function(data,err){
			// var curVol = data.result.Available;
			// if(curVol === null){
			// 	curVol = 1000;
			// }
			services.getticker( { market : "USDT-BTC" }, function( data, err ){
				curBtc = data.result.Last;
				
				services.getorderbook({ market : type_BTC, depth : 0, type : 'buy' }, function( data, err ) {
				  var result = data.result;
				  for(j = 0 ; j < result.length; j++){
				  	if(result[j].Rate * curBtc >= bidUsd){
				  		var sellVol = 0

				  		if(curVol[i] >= vol_quere[i]){
				  			sellVol = vol_quere[i];
				  			curVol[i] = curVol[i]-vol_quere[i];
				  		} else {
				  			sellVol = curVol[i];
				  			curVol[i] = 0;
				  		}
				  		var message = "Da ban: "+ sellVol +" "+type_BTC;
				  		message += "<br/> Con lai: "+ curVol[i] + " "+ type_BTC;
				  		io.sockets.emit('message',{message : message})
				  		break;
				  	}
				  }
				});		
			});				
		})
	} else {
		if (typeof sellInterval[i] !== 'undefined') {
		    clearInterval(sellInterval[i]);
		    quere.splice(i,1);
		}
	}

}

function getCurrentBtc(){
	var curBtc = 0;
	services.getticker( { market : "USDT-BTC" }, function( data, err ){
		curBtc = data.result.Last;
	});
}



function handle(message,i){

	var arr = message.split(" ");
	if(arr.length == 4){
		var action = arr[0];
		var type_BTC = "BTC-"+arr[1];
		var bid = arr[2];

		var now = new Date();
		var date_str = now.getHours() + ":" +now.getMinutes() + ":" +now.getSeconds();
		var btcCurrent = 0;
		if(action.indexOf("buy") > -1){
			var amoutUsd = arr[3];
			amout_quere[i] = amoutUsd;			
			buyInterval[i] = setInterval(function(){buy(type_BTC, bid,i)}, 1000);
		}

		store[i] = 2000;
		if(action.indexOf("sell") > -1){
			var vol = arr[3];
			vol_quere[i] = vol;
			curVol[i] = 2000;
			
			sellInterval[i] = setInterval(function(){sell(type_BTC, bid,i)}, 1000);
		}	
	} else {
		io.sockets.emit("message",{
			message : "Sai cu phap"
		})
	}		

}
console.log("Listening on port " + port);
io.sockets.on('connection', function (socket) {
    socket.emit('message', { message: `welcome to the chat bot bitcoin</br>
										Cu phap : #buy LTC 0.0001 0.3</br>
												#sell LTC 0.1 </br>
												#reset </br>
												#reset *</br>
												#list</br>
    	` });
    socket.on('send', function (data) {
    	if(data.message.indexOf('list') > -1){
    		var message = "";
    		if(quere.length > 0){
    			message = "Cac lenh trong hanh doi<br/>";
    			for(i = 0 ; i < quere.length; i++){
    				message += "<li>"+quere[i]+"</li>";
    			}
    		} else {
    			message = "Khong co lenh nao trong hang doi";
    		}
    		io.sockets.emit('message',{message :message});
    		return;
    	}
    	if(data.message.indexOf('reset *') > -1){
	    	for(i = 0; i < quere.length; i++){
	    			quere.splice(i,1);
				if (typeof buyInterval[i] !== 'undefined') {
				    clearInterval(buyInterval[i]);

				}
				if (typeof sellInterval[i] !== 'undefined') {
				    clearInterval(sellInterval[i]);
				}    			
    		}
    		return;
    	}
    	if(data.message.indexOf('reset') < 0){
    		quere.push(data.message);
    	}
    	else {
			var arr = data.message.split(" ");
			var index = arr[1];
			quere.splice(index,1);
			if (typeof buyInterval[i] !== 'undefined') {
			    clearInterval(buyInterval[i]);

			}
			if (typeof sellInterval[i] !== 'undefined') {
			    clearInterval(sellInterval[i]);
			}	    		
    	}

    	var messageToClient = "Cac lenh dang trong hang doi<br/>";
    	for(i = 0 ; i < quere.length; i++){
    		messageToClient += i+" : "+quere[i]+"<br/>";
    	}
        socket.emit('message',{message: messageToClient});
    	
    	for(i = 0 ; i < quere.length; i++){
    		handle(quere[i],i);
    	}        
    });
});