// ==UserScript==
// @name         YouTubeEXT
// @icon         https://www.youtube.com/yt/brand/media/image/YouTube-icon-full_color.png
// @namespace    skoshy.com
// @version      0.6.10
// @description  Does cool things with YouTube
// @author       Stefan Koshy
// @updateURL    https://raw.githubusercontent.com/skoshy/YoutubeEXT/master/userscript.js
// @match        *://*.youtube.com/*
// @exclude      *://*.youtube.com/embed/*
// @grant        none
// ==/UserScript==
var scriptid = 'yt-ext';

var topBarHeight = 10;
var newElements = {}; // this object-array will contain all the new elements created for the page
var timers = {}; // this object-array will contain various timers

var css = `
/* Top bar */

#masthead-positioner {
	height: ` + topBarHeight + `px !important;
	overflow: hidden;
	background-color: black;
	transition: height 0.3s, background-color 0.3s;
}

#masthead-positioner:hover {
	background-color: white;
	height: 50px !important;
}

#yt-masthead-container {
	background-color: transparent !important;
}

#masthead-positioner-height-offset {
	height: 0px !important;
}

/* Player Bottom Controls */

.ytp-chrome-bottom {
	position: relative !important;
	height: 40px !important;
	margin-top: -49px !important;
	margin-left: auto;
	margin-right: auto;
	left: 0 !important;
	overflow: hidden;
	padding-top: 10px;
}

.ytp-progress-bar-container {
	height: 10px !important;
	opacity: .5;
	top: 0px !important;
} /* makes the progress bar taller */

.ytp-progress-bar-container:hover {
	opacity: .8;
} /* makes the progress bar taller */

.ytp-chrome-controls {
	margin-top: 6px;
}

.ytp-scrubber-button {
	height: 16px !important;
	width: 16px !important;
	top: -2px !important;
}

/* Comments */

#watch-discussion {
	display: block !important;
	overflow-x: hidden;
}

/* PLAYLIST */

#player-playlist .watch-playlist {
	border-top: 1px solid #3a3a3a;
	height: 405px !important;
	left: 0;
	margin-bottom: 0;
	position: relative;
	top: 0;
	width: 100%;
	-moz-transform: none;
	-ms-transform: none;
	-webkit-transform: none;
	transform: none;
}

#placeholder-playlist {
	display: none !important;
}

#player-playlist {
	min-width: 0 !important;
}

#player-playlist .yt-uix-button-playlist-remove-item {
	height: auto;
	position: absolute;
	right: 0;
	z-index: 10;
	border-radius: 40px;
	border: 1px solid #444;
	background: rgba(0,0,0,.3);
}

#player-playlist .yt-uix-button-playlist-remove-item .yt-uix-button-icon-wrapper {
	padding: 7px;
}



/* Player */

#placeholder-player {
	display: none;
}

#player {
	max-width: none !important;
	min-width: 0 !important;
}

#player-api, #player-unavailable {
	width: 100% !important;
	margin-left: 0 !important;
	left: 0 !important;
	position: relative;
}

.html5-video-container video {
	width: 100% !important;
	height: auto !important;
	position: relative !important;
	left: 0 !important;
}

.ytp-tooltip {
	margin-left: 100px !important;
	top: 0 !important;
}

/* PLAYER - ALWAYS HIDE "SUGGESTED" TEASER IN VIDEO PLAYER AT TOP RIGHT */

.ytp-cards-teaser {
	display: none !important;
}

/* GO TO TOP BUTTON */

#` + scriptid + `-goToTop {
	position: fixed;
	bottom: 20px;
	right: 20px;
	background-color: rgba(255,255,255,.8);
	padding: 10px;
	border-radius: 30px;
	box-shadow: #ccc 0px 0px 10px;
	cursor: pointer;
	color: #666;
	z-index: 2;
}

#` + scriptid + `-goToTop:hover {
	color: #222;
	box-shadow: #aaa 0px 0px 10px;
}

/* WATCH MORE SECTION */

.watch-sidebar {
	margin-top: 0px !important;
	top: 0px !important;
}

/* The following media query will make the content below a video responsively change */
@media screen and (min-width: 657px) {
	#content {
		min-width: 0 !important;
	}

	.watch-main-col  {
		width: 60% !important;
	}

	.watch-sidebar {
		width: 38% !important;
		margin-left: 62% !important;
	}
}
@media screen and (max-width: 656px) {
	#content {
	min-width: 0 !important;
	}

	.watch-main-col, .watch-sidebar {
	width: 80% !important;
	}
}

/* FOOTER */
#body-container {
	padding-bottom: 0;
}

#footer-container {
	display: none;
}

/* "Flex Width" (small viewport) TWEAKS */

.flex-width-enabled.flex-width-enabled-snap .content-alignment, .content-snap-width-1 .flex-width-enabled.flex-width-enabled-snap .content-alignment /* This is to make the page full width if the viewport is small */
{ width: 100%; }
.flex-width-enabled .pl-video-badges, .flex-width-enabled .pl-video-added-by /* in the playlist list, these are fields that people don't really care about */
{ padding: 5px; min-width: 0; }
.flex-width-enabled .pl-video-title /* Title in the playlist view */
{ min-width: 100px; }

/* CUSTOM TOOLTIP */
.` + scriptid + `-tooltip {
	position: fixed;
	bottom: 5px;
	left: 5px;
	background: rgba(255, 255, 255, .8);
	padding: 3px;
	border-radius: 20px;
	z-index: 100;
	display: none;
}
`;

document.addEventListener("keydown", function(e) {
	if (e.altKey === true && e.code == 'KeyO') {
		// toggle style
		if (isScriptEnabled())
			turnOff();
		else
			turnOn();

		resizeCheck();
	}
});

function isScriptEnabled() {
	var cssEl = document.getElementById(scriptid);
	return !cssEl.disabled;
}

function turnOn() {
	var cssEl = document.getElementById(scriptid);
	cssEl.disabled = false;
	for (var key in newElements) {
		newElements[key].style.display = 'block';
	}
}

function turnOff() {
	var cssEl = document.getElementById(scriptid);
	cssEl.disabled = true;
	for (var key in newElements) {
		newElements[key].style.display = 'none';
	}
}

/*
	This function does a variety of checks and tweaks to the page on the resize and URL popstate
*/
function resizeCheck(e) {
	var video = document.querySelector('#player-api video');
	var videoContainer = document.querySelector('#player-api .html5-video-player');
	var playerContainer = document.querySelector('#player-api');
	var playerPlaceholder = document.querySelector('#' + scriptid + '-playerPlaceholder');
	var annotationsContainer = document.querySelector('.ytp-iv-video-content');
	var videoTooltipContainer = document.querySelector('.ytp-tooltip');

	// Change video width and height
	if (video !== null) {
		var videoRatio = video.videoWidth / video.videoHeight;
		video.style.maxWidth = window.innerWidth + 'px';
		video.style.maxHeight = (window.innerHeight - topBarHeight) + 'px';

		var videoNewHeight = parseInt(parseInt(video.style.maxWidth) / videoRatio);

		playerContainer.style.height = (videoNewHeight) + 'px';
		playerContainer.style.maxHeight = (window.innerHeight - topBarHeight) + 'px';

		if (videoTooltipContainer !== null) {
			videoTooltipContainer.style.marginTop = (videoNewHeight - videoTooltipContainer.offsetHeight - 65) + 'px';
		}
	}

	// adjust the annotations so they match up with the video
	if (annotationsContainer !== null) {
		annotationsContainer.style.zoom = (
			parseInt(window.getComputedStyle(videoContainer).width) / parseInt(annotationsContainer.style.width)
		);
	}

	var playerPlaceholderDisplay;
	var playerContainerPosition;

	// now let's check the height of the video container.
	// if there's space on the bottom, fix the video to the top so you can scroll with it in view
	// also, leave it un-fixed if the URL changed to a non-video page
	if (
		videoContainer !== null &&
		videoContainer.offsetHeight <= window.innerHeight * .75 &&
		!(window.location.href.indexOf('/watch?') == -1)
	) {
		playerContainerPosition = 'fixed';
	} else {
		playerContainerPosition = '';
	}

	playerPlaceholder.style.height = (playerContainer.offsetHeight - topBarHeight) + 'px';
	playerPlaceholder.style.width = (playerContainer.offsetWidth - topBarHeight) + 'px';

	if (!isScriptEnabled()) { // if the script isn't enabled
		// don't show the placeholder
		playerPlaceholderDisplay = 'none';
		playerContainerPosition = '';

		// reset the player height
		playerContainer.style.height = '';
		playerContainer.style.maxHeight = '';
	}

	playerPlaceholder.style.display = playerPlaceholderDisplay;
	playerContainer.style.position = playerContainerPosition;
}

// passed a target element, will check if it's an input box
function isFocusOnInputBox(target) {
	if (target.getAttribute('role') == 'textbox' || target.tagName == 'INPUT' || target.tagName == 'TEXTAREA')
		return true;
	else
		return false;
}

function pausePlayVideoCheck(event) {
	if (
		event.keyCode === 32 &&
		!isFocusOnInputBox(event.target) &&
		!event.target.classList.contains('html5-video-player') // don't pause/play if we're on the player itself. the player will handle it.
	) {
		var videoId, status;

		event.preventDefault();

		videoId = 'movie_player';
		if (document.getElementById(videoId)) {
			status = document.getElementById(videoId).getPlayerState();
			pausePlayVideo(videoId, status);
		}

		// if we're on a channel page, allow pausing/playing the main video on the channel homepage
		videoId = 'c4-player';
		if (document.getElementById(videoId)) {
			status = document.getElementById(videoId).getPlayerState();
			pausePlayVideo(videoId, status);
		}
	}
}

function pausePlayVideo(elId, status) {
	if (status === 1 || status === 3) {
		contentEval('document.querySelector("#' + elId + '").pauseVideo();');
	} else if (status === -1 || status === 2 || status === 0) {
		contentEval('document.querySelector("#' + elId + '").playVideo();');
	}

	// N/A (-4), unstarted (-1), ended (0), playing (1), paused (2), buffering (3), video cued (5).
	// from https://greasyfork.org/scripts/8687-youtube-space-pause
}

function brightnessChangeCheck(event) {
	if (!isFocusOnInputBox(event.target)) {
		if (event.shiftKey) {
			var video = document.querySelector('video.html5-main-video');

			var brightness = parseFloat(parseFromFilter('brightness', video.style.filter));
			if (!brightness || isNaN(brightness)) { // no brightness has been specified yet
				video.style.filter = 'brightness(1.0)';
				brightness = parseFloat(parseFromFilter('brightness', video.style.filter));
			}

			if (event.keyCode === 33) { // shift+pgup
				var newBrightness = brightness + .1;
				video.style.filter = 'brightness(' + newBrightness + ')';
				showTooltip('Brightness: ' + newBrightness.toFixed(2));
			} else if (event.keyCode === 34) { // shift+pgdn
				var newBrightness = brightness - .1;
				video.style.filter = 'brightness(' + newBrightness + ')';
				showTooltip('Brightness: ' + newBrightness.toFixed(2));
			}
		}
	}
}

// will parse attribute from a filter string
// ex: parseFromFilter('brightness', 'brightness(1.5)') => 1.5
// will return false if it can't parse it
function parseFromFilter(name, string) {
	if (string == undefined)
		return false;

	var startLength = name.length + 1;
	var startPos = string.indexOf(name + '(');

	if (startPos == -1)
		return false;

	var endPos = string.indexOf(')', startLength + startPos);

	if (endPos == -1)
		return false;

	return string.substring(startLength + startPos, startLength + startPos + endPos);
}

function showTooltip(text) {
	newElements.tooltip.innerHTML = text;
	newElements.tooltip.style.display = 'block';

	clearTimeout(timers.tooltip);
	timers.tooltip = setTimeout(function() {
		newElements.tooltip.style.display = 'none';
	}, 1000);
}

/************
Initialize
************/

function initialize() {
	// create the tooltip
	newElements.tooltip = document.createElement('div');
	newElements.tooltip.className = scriptid + '-tooltip';
	setTimeout(function(){newElements.tooltip.style.display = 'none';}, 200); // there needs to be a delay to hide the brightness box for some reason
	insertAfter(newElements.tooltip, document.querySelector('#body-container'));

	// initialize spacebar checking to pause video
	document.body.addEventListener('keydown', pausePlayVideoCheck);

	// initialize check for increasing/decreasing brightness
	document.body.addEventListener('keydown', brightnessChangeCheck);

	// Checks things on window resize
	window.addEventListener("resize", resizeCheck);
	// Check things when the page URL changes
	window.addEventListener('popstate', resizeCheck);

	addGlobalStyle(css, scriptid);

	var playerContainer = document.querySelector('#player-api');

	// create the player placeholder. this will be 'displayed' when the player fixes to the top. this will push the rest of the content down.
	newElements.playerPlaceholder = document.createElement('div');
	newElements.playerPlaceholder.style.display = 'none';
	newElements.playerPlaceholder.id = scriptid + '-playerPlaceholder';
	insertAfter(newElements.playerPlaceholder, playerContainer);

	// create the "Go To Top" button
	newElements.goToTop = document.createElement('div');
	newElements.goToTop.id = scriptid + '-goToTop';
	newElements.goToTop.onclick = function() {
		window.scrollTo(0, 0);
	};
	newElements.goToTop.innerHTML = `
	<div class="">&#9650;</div>
	`;
	insertAfter(newElements.goToTop, document.querySelector('#body-container'));

	turnOn();

	var defaultEvent = {
		'type': 'interval'
	};
	resizeCheck(defaultEvent);
  
	setInterval(function() {
      let player = document.querySelector("#player");
	  
	  if (player) {
	    eventFire(player, 'resize');
	  }
	}, 250);
}

initialize();

/************
Utility Functions
************/

function insertAfter(newNode, referenceNode) {
	referenceNode.parentNode.insertBefore(newNode, referenceNode.nextSibling);
}

function addGlobalStyle(css, id) {
	var head, style;
	head = document.getElementsByTagName('head')[0];
	if (!head) {
		return;
	}
	style = document.createElement('style');
	style.type = 'text/css';
	style.innerHTML = css;
	style.id = id;
	head.appendChild(style);
}

// Run codes "unsafely"
// from https://greasyfork.org/scripts/8687-youtube-space-pause
function contentEval(source) {
	// Check for function input.
	if ('function' === typeof source) {
		// Execute this function with no arguments, by adding parentheses.
		// One set around the function, required for valid syntax, and a
		// second empty set calls the surrounded function.
		source = '(' + source + ')();';
	}

	// Create a script node holding this source code.

	var script = document.createElement('script');
	script.setAttribute("type", "application/javascript");
	script.textContent = source;

	// Insert the script node into the page, so it will run, and immediately remove it to clean up.
	document.body.appendChild(script);
	document.body.removeChild(script);
}

// Used from http://stackoverflow.com/questions/2705583/simulate-click-javascript
function eventFire(el, etype) {
	if (el.fireEvent) {
		(el.fireEvent('on' + etype));
	} else {
		var evObj = document.createEvent('Events');
		evObj.initEvent(etype, true, false);
		el.dispatchEvent(evObj);
	}
}