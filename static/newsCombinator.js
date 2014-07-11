var player;
var currentRenderObject;
var hideControlsTimer;

// var tips = new Tooltips(document, {
// 	tooltip:    {},          // Options for individual Tooltip instances.
// 	key:       'tooltip',    // Tooltips data attribute key.
// 	showOn:    'mouseenter', // Show tooltip event.
// 	hideOn:    'mouseleave', // Hide tooltip event.
// 	observe:   0             // Enable mutation observer (used only when supported).
// });

function timeSelected()
{
	if (player)
	{
		// if a video is already playing we should pause it while we prepare and load the next videos
		delete player;

		// remove any currently existing video elements
		videoContainer = document.getElementById('um_video_player_wrapper');
		while (videoContainer.hasChildNodes()) {
			videoContainer.removeChild(videoContainer.lastChild);
		}

	}

	var timeRequested = event.target.id;
	var request = new XMLHttpRequest();
	request.onload = setupVideoPlayer;

	var queryString = '?t=' + timeRequested;
	request.open('GET', '/renderObjectForTimeAvailable' + queryString, true); // request a renderObject from the server
	request.send();
}

function setupVideoPlayer()
{
	var response = JSON.parse(this.responseText);
	if (response.errorCode != 0)
	{
		// there was an error
		return;
	}
	
	currentRenderObject = response.renderObject;

	// ----------------------
	// create thumbnails
	// ----------------------
	var playlistContainer = document.getElementById('playlistContainer');
	for (var i = 0; i < currentRenderObject.EDL.length; i++)
	{
		var thumbnail = document.createElement('img');
		thumbnail.setAttribute('src', currentRenderObject.EDL[i].thumbnail);

		var title = document.createElement('p');
		title.textContent = currentRenderObject.EDL[i].title;

		var thumbnailContainer = document.createElement('div');
		thumbnailContainer.setAttribute('class', 'thumbnailContainer');
		thumbnailContainer.appendChild(thumbnail);
		thumbnailContainer.appendChild(title);

		var clipElement = document.createElement('div');
		clipElement.setAttribute('class', 'video');
		clipElement.setAttribute('id', 'clip' + i);
		clipElement.style.width = (100.0 / (currentRenderObject.EDL.length)) + '%';
		clipElement.appendChild(thumbnailContainer);
		clipElement.addEventListener('click', clipClicked);
		clipElement.setAttribute('data-tooltip', currentRenderObject.EDL[i].title + "");

		playlistContainer.appendChild(clipElement);
				// tips.add(videoElement);
		// tips.reload();
	}

	// ----------------------
	// load video player
	// ----------------------
    function onReady() {        
        // fade into the proper display situation
        var timeSelectionContainer = document.getElementById('timeSelectionContainer');
        var descriptionContainer = document.getElementById('descriptionContainer');
        var temporaryBackground = document.getElementById('temporaryBackground');
        var controlsContainer = document.getElementById('controlsContainer');

        timeSelectionContainer.style.webkitTransition = "max-width 1s, margin 1s, opacity .4s";
        descriptionContainer.style.webkitTransition = "height 1s, opacity 1s";
        temporaryBackground.style.webkitTransition = "opacity 1s, visibility 1s";
        controlsContainer.style.webkitTransition = "opacity 1s";

        timeSelectionContainer.style.maxWidth = "100%";
        timeSelectionContainer.style.marginTop = "0";
        descriptionContainer.style.height = "0";
        descriptionContainer.style.opacity = 0;
        temporaryBackground.style.opacity = 0;
        temporaryBackground.style.visibility = "hidden";
        controlsContainer.style.visibility = "visible";
        controlsContainer.style.opacity = 1;

        // start the video
		player.play();
		
		// start the timer for hiding all of the unwanted controls
		mouseMove();
    }

    function onLoadError(e) {
        console.log("ERROR", e);
    }

    function onTimeUpdate() {
        console.log("ON TIME UPDATE",　"Current Time is:", this.currentTime());
    }

    function onFinish() {
        mouseMove();
    }

    function playHandler() {
    	var playedElement = document.getElementById('played');
    	playedElement.style.webkitTransition = "";
    	playedElement.style.opacity = 1;
    	playedElement.style.visibility = "visible";
    	playedElement.style.webkitTransition = "opacity .3s, visibility .3s";
    	
    	setTimeout(function() {
    		playedElement.style.opacity = 0;
    		playedElement.style.visibility = "hidden";
    	}, 1000);
    }

    function pauseHandler() {
    	var pausedElement = document.getElementById('paused');
    	pausedElement.style.webkitTransition = "";
    	pausedElement.style.opacity = 1;
    	pausedElement.style.visibility = "visible";
    	pausedElement.style.webkitTransition = "opacity .3s, visibility .3s";
    	
    	setTimeout(function() {
    		pausedElement.style.opacity = 0;
    		pausedElement.style.visibility = "hidden";
    	}, 1000);
    }

    player = new UMVideoPlayer("um_video_player_wrapper", response.renderObject, {
        "onReady" : onReady, 
        "onLoadError" : onLoadError, 
        "onTimeUpdate" : onTimeUpdate, 
        "onFinish" : onFinish,
        "playHandler" : playHandler,
        "pauseHandler" : pauseHandler,
        "transitionTime" : .3,
        "classString" : "um-videoPlayer",
        "autoReload" : false,
    });
	
	
}

function videoClicked()
{
	player.togglePlayPause();
	mouseMove();
}

function mouseMove()
{
	clearTimeout(hideControlsTimer);
	var timeSelectionContainer = document.getElementById('timeSelectionContainer');
	timeSelectionContainer.style.opacity = "1";
	document.body.style.cursor = "auto";


	if (player && player.isVideoPlaying)
	{
		hideControlsTimer = setTimeout(function () {
			var containerToHide = document.getElementById('timeSelectionContainer');
			containerToHide.style.opacity = "0";
			document.body.style.cursor = "none";
		}, 3000);
	}
}

function clipClicked(e)
{
	var clipIndex = parseInt(this.id.substring(4));
	console.log(clipIndex);
	player.seekToClipIndex(clipIndex);
}