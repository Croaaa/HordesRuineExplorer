/**
 * $Id: ruine_explorer.user.js 75 2013-05-13 00:00:00Z jolan $
 * Copyright (c) 2008-2010 JC Plessis
 * Released under the GPL license
 *
 *
 * @author  jcplessis <jcplessis@gmail.com>
 * @license http://www.gnu.org/copyleft/gpl.html  GNU General Public License
 * @charset UTF-8
 */
// ==UserScript==
// @name           RuineExplorer++
// @namespace      http://jplessis.free.fr/
// @icon           http://data.twinoid.com/proxy/www.hordes.fr/img/icons/r_ruine.gif
// @description    Permet de tracer les cartes dans les ruines de hordes.fr
// @include        http://www.hordes.fr/*
// @include        http://jcplessis.alwaysdata.net/hordes/ruine_explorer/ruine_simulator.html
// @include        http://bbh.fred26.fr/?pg=ruines*
// @version        0.0.10
// @author         JC Plessis (màj Eliam/Fregaton)
// @grant          GM_getValue
// @grant          GM_setValue
// @grant          GM_deleteValue
// @updateURL      https://github.com/Croaaa/HordesRuineExplorer/raw/main/HordesRuineExplorerPlus.user.js
// @downloadURL    https://github.com/Croaaa/HordesRuineExplorer/raw/main/HordesRuineExplorerPlus.user.js

// ==/UserScript==
console.log('Hello RuineExplorer');
var CELL_SIZE=16;
var CELL_NB=16;
var current_position = [0, 0]
var cells = []
var est_fuite = false; //Si jamais on vient de fuir
function init_cells(){
    for(var i =0; i < CELL_NB; i++){
        var line = []
        for(var j = 0; j < CELL_NB; j++){
            line.push({});
        }
        cells.push(line)
    }
    get_cell(0, 0).visited=true;
    get_cell(0, 0).has_north=true;
}
init_cells();
var CANVAS_WIDTH=CELL_SIZE*CELL_NB;
var root = document.createElement('div');
root.setAttribute('id', 'ruine_explorer');
root.setAttribute('style', 'position: absolute; bottom: 5;');
root.innerHTML = '<style> button {    background-image : url("https://media.discordapp.net/attachments/461236623762522134/753661858291908698/button.png"); border : 1px solid black;    color: #d9d2ca;}</style>' +
    '<div id="map" style="display:none; border:3px solid #8ca1b5; background:#494d60; padding : 5px; " >' +
    '<button onclick="document.dispatchEvent(new CustomEvent(\'clear_map\'));">Reset</button>' +
    '<button onclick="document.dispatchEvent(new CustomEvent(\'copy_map\'));">Copy BBH</button>' +
    '<button onclick="document.dispatchEvent(new CustomEvent(\'add_exit\', {\'detail\':\'north\'}));"><img src="https://media.discordapp.net/attachments/461236623762522134/753659705167184047/north.png" /></button>' +
    '<button onclick="document.dispatchEvent(new CustomEvent(\'add_exit\', {\'detail\':\'south\'}));"><img src="https://media.discordapp.net/attachments/461236623762522134/753659846494257162/south.png" /></button>' +
    '<button onclick="document.dispatchEvent(new CustomEvent(\'add_exit\', {\'detail\':\'east\'}));"><img src="https://media.discordapp.net/attachments/461236623762522134/753659941004247160/east.png" /></button>' +
    '<button onclick="document.dispatchEvent(new CustomEvent(\'add_exit\', {\'detail\':\'west\'}));"><img src="https://media.discordapp.net/attachments/461236623762522134/753660021577089135/west.png" /></button><br/>' +
    '<canvas id="ruine_canvas" width="' + CANVAS_WIDTH + 'px" height="' + CANVAS_WIDTH + 'px"></canvas>' +
    '</div>' +
    '<br/><a style="display:inline-block; margin:1px; border:3px solid #8ca1b5; background:#494d60; padding : 5px; color: #d9d2ca; text-decoration:  none; " href="#" onclick="document.dispatchEvent(new CustomEvent(\'hide_show_map\')); return false;">RUINE EXPLORER</a>';
document.body.appendChild(root);
function createCookie(name,value) {
    setTimeout(function() {
        GM_setValue(name, JSON.stringify(value));
    }, 0);
}
function readCookie(name) {
    return JSON.parse(GM_getValue(name));
}
function eraseCookie(name) {
    GM_deleteValue(name);
}
var context = null;
function get_canvas(){
    if (context == null){
        console.log("Create canvas");
        var c=document.getElementById("ruine_canvas");
        context = c.getContext("2d");
        context.globalAlpha=1;
        context.translate(0.5, 0.5);
    }
    return context;
}
function draw_line(p1, p2, color) {
    var ctx = get_canvas();
    get_canvas().strokeStyle = color;
    ctx.beginPath();
    ctx.moveTo(p1[0],p1[1]);
    ctx.lineTo(p2[0],p2[1]);
    ctx.stroke();
}
function draw_open(){
    draw_line([2, 0], [2, 2]);
    draw_line([CELL_SIZE-2, 0], [CELL_SIZE-2, 2]);
}
function draw_wall(){
    draw_line([2, 2], [CELL_SIZE-2, 2]);
}
function draw_cell(has_opening, rotation){
    var canvas = get_canvas();
    canvas.save();
    canvas.translate(CELL_SIZE / 2, CELL_SIZE / 2);
    canvas.rotate(rotation);
    canvas.translate(CELL_SIZE / -2, CELL_SIZE / -2);
    if(has_opening){
        draw_open();
    }else{
        draw_wall();
    }
    canvas.restore();
}
function draw_img(src, x, y){
    var img=new Image();
    img.canvas_x = x;
    img.canvas_y = y;
    img.addEventListener('load', function(param) {
        var canvas = get_canvas();
        canvas.save();
        canvas.translate(CANVAS_WIDTH/2 + this.canvas_x*CELL_SIZE, this.canvas_y*CELL_SIZE);
        canvas.drawImage(this, 2, 2, CELL_SIZE - 4, CELL_SIZE - 4);
        canvas.restore();
        draw_current_location();
    });
    img.src=src
}
function draw_square(x, y, cell){
    var canvas = get_canvas();
    canvas.save();
    canvas.beginPath();
    canvas.translate(CANVAS_WIDTH/2 + x*CELL_SIZE, y*CELL_SIZE);
    canvas.strokeStyle = "Black";
    if (cell.has_zombie){
        canvas.beginPath();
        canvas.fillStyle = "#E01B5D";
        canvas.fillRect(2, 2, CELL_SIZE-4, CELL_SIZE-4);
    }
    else{
        canvas.beginPath();
        canvas.fillStyle = "#494d60";
        canvas.fillRect(2, 2, CELL_SIZE-4, CELL_SIZE-4);
    }
    if (cell.has_room){
        draw_img('https://media.discordapp.net/attachments/461236623762522134/753661963694899336/small_enter.png', x, y);
    }else {
        if (cell.has_empreinte){
            canvas.beginPath();
            canvas.fillStyle = "#0ED145";
            canvas.fillRect(2, 2, CELL_SIZE-4, CELL_SIZE-4);
        }
        if (cell.has_keyper){
            draw_img('http://data.hordes.fr/gfx/icons/item_bumpKey.gif', x, y);
        }
        else if (cell.has_keymag){
            draw_img('http://data.hordes.fr/gfx/icons/item_magneticKey.gif', x, y);
        }
        else if (cell.has_keydec){
            draw_img('http://data.hordes.fr/gfx/icons/item_classicKey.gif', x, y);
        }
    }
    draw_cell(cell.has_north, 0)
    draw_cell(cell.has_south, Math.PI)
    draw_cell(cell.has_east, Math.PI / 2)
    draw_cell(cell.has_west, 3 * Math.PI / 2)
    canvas.restore();
}
function draw_current_location(){
    var x = current_position[0]
    var y = current_position[1]
    var canvas = get_canvas();
    canvas.save();
    canvas.fillStyle = "#bdcf20";
    canvas.translate(CANVAS_WIDTH/2 + (x+0.5)*CELL_SIZE, (y+0.25)*CELL_SIZE);
    canvas.rotate(Math.PI / 4);
    canvas.fillRect(0, 0, CELL_SIZE * 0.4, CELL_SIZE*0.4);
    canvas.restore();
}
function treat_events(){
    var canvas = get_canvas();
    canvas.clearRect(0, 0, 500, 500);
    for(var i = CELL_NB / -2; i < CELL_NB / 2; i++){
        for(var j = 0; j < CELL_NB; j++){
            var cell = get_cell(i, j);
            if (cell.visited){
                draw_square(i, j, cell);
            }
        }
    }
    draw_current_location();
}
function init() {
    js.XmlHttp._ruine_onEnd = js.XmlHttp.onEnd;
    js.XmlHttp.onEnd = function() {
        function getPopupContent() {
            if (sel('#notificationText')==null) return null;
            else {
            let text= sel('#notificationText').textContent;
            text= text.replace(/[\s]/g, ' ');
            text= text.replace(/[ ]{2,}/g, ' ');
            return text.trim();
            }
        }
        function sel(a,b) {
            let c= b||document, d= /^(?:#([\w-]+)|\.([\w-]+))$/.test(a), e= 0;
            if(d&&a[0]===".") {
                return c.getElementsByClassName(a.slice(1))[0];
            } else if(d&&a[0]==="#") {
                return document.getElementById(a.slice(1));
            } else {
                return c.querySelector(a);
            }
        }
        var url = this.urlForBack;
        this._ruine_onEnd();
        console.log('Ruine explorer url = ' + url);
        var event = undefined;
        if( /explo\/move\?x=(-?[0-9]+);y=(-?[0-9]+)/.test(url) ) {
            var x = parseInt(RegExp.$1);
            var y = parseInt(RegExp.$2);
            console.log("Move " + x + "/" + y);
            event = ["MOVE", x, y];
        }
        if( /explo\/flee/.test(url) ) {
            console.log("Fuite !");
            event = ["FLEE"];
        }
        if( /explo\/enterRoom/.test(url) || /explo\/searchRoom/.test(url) || /explo\/leaveRoom/.test(url)) {
            console.log("Piece !");
            event =["ROOM"];
        }
        if( /explo\/quit/.test(url)) {
            console.log("Sortie !");
            event =["QUIT"];
        }
        if( /explo\/unlockDoor/.test(url)) {
            console.log("Porte verouillée !");
            var popup = "";
            popup = getPopupContent()
            if (/percussion/.test(popup)){
                console.log("Clé à Percussion !");
                event =["KEY_PER"];
            }
            else if (/magnétique/.test(popup)){
                console.log("Clé magnétique !");
                event =["KEY_MAG"];
            }
            else if (/Décapsuleur/.test(popup)){
                console.log("Décapsuleur !");
                event =["KEY_DEC"];
            }
            else event = ["KEY_PER"];
        }
        if( /explo\/blankKey/.test(url)) {
            console.log("Empreinte !").
            popup = getPopupContent();
            if (!popup==null) event =["EMPREINTE"];
        }
        if (event != undefined) {
            var evt = new CustomEvent('ruine_event', {"detail":event});
            document.dispatchEvent(evt);
        }
    };
}
function get_cell(x, y){
    return cells[y][x+CELL_NB/2]
}
function get_current_cell(){
    var x = current_position[0];
    var y = current_position[1];
    return get_cell(x, y);
}
function handle_move(x, y, dx, dy){
    var current_cell = get_cell(x, y);
    current_cell.visited = true;
    console.log("Handle move");
    if (dx == 1){
        current_cell.has_east = true;
    }
    if (dx == -1){
        current_cell.has_west = true;
    }
    if (dy == -1){
        current_cell.has_north = true;
    }
    if (dy == 1){
        current_cell.has_south = true;
    }
    return current_cell;
}
function treat_event(event){
    event = event.detail
    var x = current_position[0];
    var y = current_position[1];
    var current_cell = get_cell(x, y);
    current_cell.visited = true;
    console.log(event[0]);
    switch (event[0]){
        case "ROOM":
            current_cell.has_room=true;
            break;
        case "FLEE":
            current_cell.has_zombie=true;
            est_fuite = true;
            break;
        case "EMPREINTE":
            current_cell.has_empreinte=true;
            break;
        case "KEY_PER":
            current_cell.has_keyper=true;
            break;
        case "KEY_MAG":
            current_cell.has_keymag=true;
            break;
        case "KEY_DEC":
            current_cell.has_keydec=true;
            break;
        case "MOVE":
            console.log("Move " + x + "/" + y);
            handle_move(x, y, event[1], event[2]);
            x += event[1];
            y += event[2];
            handle_move(x, y, event[1] * -1, event[2] * -1);
            current_position = [x, y]
            if (!est_fuite){
                current_cell.has_zombie=false;
            }
            est_fuite=false;
            break;
    }
    createCookie("cells", cells);
    createCookie("current_position", current_position);
    treat_events();
}
document.addEventListener("ruine_event", treat_event);
function realign_map(){
    var map = document.getElementById("ruine_explorer");
    var doc = document.documentElement, body = document.body;
    var top = (doc && doc.scrollTop || body && body.scrollTop || 0);
    map.style.bottom = (window.innerHeight - document.documentElement.clientHeight - top) + "px";
}
function clear_map(event){
    console.log("Clear map");
    eraseCookie("cells");
    eraseCookie("current_position");
    current_position = [0, 0];
    cells = [];
    init_cells();
    createCookie("cells", cells);
    createCookie("current_position", current_position);
    treat_events();
}
document.addEventListener("clear_map", clear_map);
function getCellType(cell) {
    n = (cell.has_north ? 1 : 0) + (cell.has_south ? 1 : 0) + (cell.has_east ? 1 : 0) + (cell.has_west ? 1 : 0);
    switch(n) {
        case 1:
            if(cell.has_north)
                return 41;
            if(cell.has_south)
                return 43;
            if(cell.has_east)
                return 44;
            if(cell.has_west)
                return 42;
        case 2:
            if(cell.has_north) {
                if(cell.has_south)
                    return 11;
                if(cell.has_east)
                    return 31;
                if(cell.has_west)
                    return 32;
            }
            if(cell.has_south) {
                if(cell.has_east)
                    return 33;
                if(cell.has_west)
                    return 34;
            }
            return 12;
        case 3:
            if(!cell.has_north)
                return 24;
            if(!cell.has_south)
                return 22;
            if(!cell.has_east)
                return 23;
            if(!cell.has_west)
                return 21;
        case 4:
            return 13;
    }
}
function copy_map(event){
    try {
        t = '';
        for(let y in cells) {
            if(y == 0) { // BBH entrance
                continue
            }
            for(let x in cells[y]) {
                if(cells[y][x].visited) {
                    const bbhIndex = ((+y)+1)*29+(+x)+7;
                    sel_case(bbhIndex);
                    mod_case('m', getCellType(cells[y][x]));
                    console.log(x, ";", y, " / ", bbhIndex, " => ", getCellType(cells[y][x])) ;
                    if(cells[y][x].has_room) {
                        mod_case('p', 1);
                    } else if(cells[y][x].has_keyper) {
                        mod_case('p', 4);
                    } else if(cells[y][x].has_keymag) {
                        mod_case('p', 3);
                    } else if(cells[y][x].has_keydec) {
                        mod_case('p', 5);
                    }
                }
            }
        }
    } catch(e) {
        alert("Allez sur une page d'édition de ruine sur bbh.fred26.fr !");
    }
}
document.addEventListener("copy_map", copy_map);
function hide_show_map(event){
    var map = document.getElementById("map");
    if (window.getComputedStyle(map).getPropertyValue("display") == "none"){
        map.style.display = "inline-block";
        createCookie("map_visible", true);
    } else {
        map.style.display = "none";
        createCookie("map_visible", false);
    }
}
document.addEventListener("hide_show_map", hide_show_map);
function add_exit(event){
    var direction = event.detail;
    var cell = get_current_cell();
    cell["has_" + direction] = true;
    var x = 0;
    var y = 0;
    var new_direction = "";
    if (direction == "south"){
        new_direction = "north";
        y = 1;
    }
    if (direction == "north"){
        new_direction = "south";
        y = -1;
    }
    if (direction == "east"){
        new_direction = "west";
        x = 1;
    }
    if (direction == "west"){
        new_direction = "east";
        x = -1;
    }
    console.log("Rha ?" + x + " " + y + " " + new_direction);
    get_cell(current_position[0] + x, current_position[1] + y)["has_" + new_direction] = true;
    createCookie("cells", cells);
    treat_events();
}
document.addEventListener("add_exit", add_exit);
realign_map();
window.onscroll = realign_map;
try{
    cells = readCookie("cells") || [];
    current_position = readCookie("current_position") || [0, 0]
    treat_events();
}catch(err){
    cells = [];
    init_cells();
    current_position = [0, 0];
}
var map_visible = readCookie("map_visible", true);
if (map_visible) {
    hide_show_map();
}
var script = document.createElement('script');
script.setAttribute('id', 'hmu:script:init');
script.setAttribute('type', 'application/javascript');
root.appendChild(script);
script.textContent = '(' + init.toString() + ')();';
