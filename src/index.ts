import * as cv from "@u4/opencv4nodejs";
import { resolve } from "path";
import * as fs from "fs";

const displayText = `#!/bin/sh

feh . --info "./getSeconds.mjs %n"`;

const getSecondsText = `#!/usr/bin/env node
import { readFileSync } from "fs";
import { argv, stdout } from "process";

const dataString = readFileSync("face_data.json", {encoding: "utf-8"});
const data = JSON.parse(dataString);
const fileName = argv[2];
if(fileName == undefined) process.exit(0);

const frameIndex = fileName.split("_")[0];
const seconds = frameIndex / data.framerate;

const minutes = Math.floor(seconds / 60);

const timestamp = minutes + ":" + (seconds % 60);

stdout.write(timestamp);`;

const cascade = new cv.CascadeClassifier(__dirname + "/../lbpcascade_animeface.xml");

function run(filePath = "input.mp4", outDir = "out/", framerate: any = 4) {
    // just to make sure we receive this as a number

    framerate = Number(framerate);
    const jsonData: any = {
        framerate: framerate,
        faces: {}
    };

    filePath = resolve(process.cwd(), filePath);
    outDir = resolve(process.cwd(), outDir);

    if(!fs.existsSync(filePath)) {
        console.log("input file does not exist");
        return;
    }

    if(!fs.existsSync(outDir)) {
        console.log("output directory does not exist");
        return;
    }

    const vc = new cv.VideoCapture(filePath);

    let image = vc.read();
    let imageIndex = 0;
    while(!image.empty) {
        image = vc.read();
    
        if(imageIndex % framerate != 0) {
            imageIndex++;
            continue;
        }
    
        const gray = image.cvtColor(cv.COLOR_BGR2GRAY).equalizeHist();
    
        const faces = cascade.detectMultiScale(gray, {
            scaleFactor: 1.1,
            minNeighbors: 5,
            minSize: new cv.Size(120, 120)
        });

        if(faces.objects.length > 0) jsonData.faces[imageIndex] = [];

        for (let i = 0; i < faces.objects.length; i++) {
            const face = faces.objects[i];
            const faceImage = image.getRegion(face);

            const fileName = imageIndex + "_" + i + ".png";
    
            jsonData.faces[imageIndex][i] = fileName;
            cv.imwrite(outDir + "/" + fileName, faceImage);
        }
    
        imageIndex++;
    }

    fs.writeFileSync(outDir + "/face_data.json", JSON.stringify(jsonData));

    fs.writeFileSync(outDir + "/display", displayText);
    fs.writeFileSync(outDir + "/getSeconds.mjs", getSecondsText);

    fs.chmodSync(outDir + "/display", "744");
    fs.chmodSync(outDir + "/getSeconds.mjs", "744");
}

run(process.argv[2], process.argv[3], process.argv[4]);