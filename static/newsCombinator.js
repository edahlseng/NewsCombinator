var player;
var currentRenderObject;
var hideControlsTimer;

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
		console.log(i);

		var thumbnail = document.createElement('img');
		thumbnail.setAttribute('src', currentRenderObject.EDL[i].thumbnail);

		var title = document.createElement('p');
		title.textContent = currentRenderObject.EDL[i].title;

		var thumbnailContainer = document.createElement('div');
		thumbnailContainer.setAttribute('class', 'thumbnailContainer');
		thumbnailContainer.appendChild(thumbnail);
		thumbnailContainer.appendChild(title);

		var videoElement = document.createElement('div');
		videoElement.setAttribute('class', 'video');
		videoElement.style.width = (100.0 / (currentRenderObject.EDL.length)) + '%';
		videoElement.appendChild(thumbnailContainer);

		playlistContainer.appendChild(videoElement);
	}

	// ----------------------
	// load video player
	// ----------------------
    function onReady() {        
        // fade into the proper display situation
        var timeSelectionContainer = document.getElementById('timeSelectionContainer');
        var descriptionContainer = document.getElementById('descriptionContainer');
        var temporaryBackground = document.getElementById('temporaryBackground');

        timeSelectionContainer.style.webkitTransition = "max-width 1s, margin 1s, opacity .4s";
        descriptionContainer.style.webkitTransition = "height 1s, opacity 1s";
        temporaryBackground.style.webkitTransition = "opacity 1s, visibility 1s";

        timeSelectionContainer.style.maxWidth = "100%";
        timeSelectionContainer.style.marginTop = "0";
        descriptionContainer.style.height = "0";
        descriptionContainer.style.opacity = 0;
        temporaryBackground.style.opacity = 0;
        temporaryBackground.style.visibility = "hidden";

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

    console.log('okay');
    player = new UMVideoPlayer("um_video_player_wrapper", response.renderObject, {
        "onReady" : onReady, 
        "onLoadError" : onLoadError, 
        "onTimeUpdate" : onTimeUpdate, 
        "onFinish" : onFinish,
        "transitionTime" : .3,
        "classString" : "um-videoPlayer",
        "autoReload" : false
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