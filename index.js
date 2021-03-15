const fs = require("fs");
const zlib = require("zlib");
const DOMParser = require("xmldom").DOMParser;
const AMF = require("./amf.js");

let bin = fs.readFileSync('./testMaps/map.png');
let offset = bin.length - 4;
let signature = bin.readUInt32BE(offset);
if(signature != 0x2e4b3344) {
	throw("Not a Kub3dit map !")
}

if(!fs.existsSync("kubes")){
	fs.mkdirSync("kubes");
}

offset -= 4;
let dataLength = bin.readUInt32BE(offset);
offset -= dataLength;
let zlibData = bin.slice(offset, offset + dataLength);
let rawData;
try {
	rawData = zlib.inflateSync(zlibData);
}catch(error) {
	console.error("invalid ZLIB data");
}

// console.log(result);
let version = rawData.readInt8(0);
let mapData;
offset = 1;
switch(version) {
	case 1:
		mapData = rawData.slice(offset, offset + rawData.length);
		break;
	case 3:
	case 2:
		let customKubesLength = rawData.readUIntBE(offset, 1);
		offset += 1;
		console.log("CUSTOM KUBES : "+customKubesLength);
		for (let i = 0; i < customKubesLength; i++) {
			xmlLength = rawData.readInt16BE(offset);
			// console.log(xmlLength);
			offset += 2;
			let xmlBin = rawData.slice(offset, offset + xmlLength);
			offset += xmlLength;
			var doc = new DOMParser().parseFromString(xmlBin.toString());
			// console.log(xmlBin.toString());
			let id = doc.documentElement.getAttribute("id");
			let uid = doc.documentElement.getAttribute("uid");
			let name = doc.documentElement.getAttribute("name");
			let pseudo = doc.documentElement.getAttribute("pseudo");
			let date = doc.documentElement.getAttribute("date");
			let voted = doc.documentElement.getAttribute("voted");
			let hallOfFame = doc.documentElement.getAttribute("hof");
			let kubeDataB64 = doc.documentElement.textContent;
			let kubeData = Buffer.from(kubeDataB64, "base64");
			let aBuffer = new ArrayBuffer(kubeData.length);
			var view = new Uint8Array(aBuffer);
			for (let j = 0; j < kubeData.length; ++j) {
				view[j] = kubeData[j];
			}
			let data = AMF.deserialize(aBuffer);
			if(!fs.existsSync("kubes/"+id)){
				fs.mkdirSync("kubes/"+id);
			}
			let codes = ["side","side","side","side","top","bottom",null,null,"iso"];
			for (let j = 0; j < data.length; j++) {
				let buffer = extractKubeImage(data[j]);
				if(buffer) {
					fs.writeFileSync("kubes/"+id+"/"+codes[j]+".png", buffer);
				}
			}

			// console.log(id);
			// console.log(uid);
			// console.log(name);
			// console.log(pseudo);
			// console.log(date);
			// console.log(voted);
			// console.log(hallOfFame);
		}
		let cameraPos = {};
		//Units : cubes*1000
		cameraPos.x = rawData.readIntBE(offset,2);
		offset += 2;
		cameraPos.y = rawData.readIntBE(offset,2);
		offset += 2;
		cameraPos.z = rawData.readIntBE(offset,2);
		offset += 2;
		console.log("Camera position : ",cameraPos);

		let cameraOrientation = {};
		//Angles in degrees
		cameraOrientation.rx = rawData.readIntBE(offset,4);
		offset += 4;
		cameraOrientation.ry = rawData.readIntBE(offset,4);
		offset += 4;
		console.log("Camera orientation : ",cameraOrientation);
		
		//Parse camera paths
		let src = rawData.slice(offset, rawData.length);
		let aBuffer = new ArrayBuffer(src.length);
		var view = new Uint8Array(aBuffer);
		for (let j = 0; j < src.length; ++j) {
			view[j] = src[j];
		}
		let deserializer = new AMF.Deserializer(aBuffer);
		let cameraPath = deserializer.deserialize();
		offset += deserializer.pos;

		let mapSizes = {}
		//Sizes in kubes
		mapSizes.x = rawData.readIntBE(offset,2);
		offset += 2;
		mapSizes.y = rawData.readIntBE(offset,2);
		offset += 2;
		mapSizes.z = rawData.readIntBE(offset,2);
		offset += 2;
		console.log("Map sizes : ",mapSizes);

		mapData = rawData.slice(offset, rawData.length);
		//data format:
		//0,1,2
		//3,4,5
		//6,7,8
		//Next layer:
		//9,10,11
		//12,13,14
		//15,16,17

		let secondLayer = mapData.slice(mapSizes.x*mapSizes.y*1, mapSizes.x*mapSizes.y*2);
		let thirdLayer = mapData.slice(mapSizes.x*mapSizes.y*2, mapSizes.x*mapSizes.y*3);
		
		break;
}



function extractKubeImage(data) {
	var buffer;
	if(data instanceof Array) {
		buffer = Buffer.alloc(data.length);
		for (let j = 0; j < buffer.length; ++j) {
			buffer[j] = data[j];
		}
	}else if(data instanceof ArrayBuffer) {
		buffer = Buffer.alloc(data.byteLength);
		var uintA = new Uint8Array(data);
		for (let j = 0; j < buffer.length; ++j) {
			buffer[j] = uintA[j];
		}
	}
	return buffer;
}