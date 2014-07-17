// TODO:
//
// future: better support for transitions, 
// better controls in the demo page
// wait to send durationLoaded callback until after the object has been fully created
// add loading wheel
// if seeking is in a video element that already exists, then just play it....will speed up seeking
// fullscreen support
// to note: clips 1 sec or less experience a delay, need to optimize, option to load X number of videos in advance to adjust accordingly



function UMVideoPlayer(wrapperId, renderObject, options) {
    // helper variables
    var self = this;
    this.playerID = "UMVideoPlayer" + Math.round(Math.random() * (2000 - 1000) + 1000); // add a random number at the end in order to help prevent conflicting ID's with user defined elements

    this.videoContainer = document.getElementById(wrapperId);

    // event handlers
    this.onReady = options.onReady;
    this.onLoadError = options.onLoadError;
    this.clipStartedHandler = options.clipStartedHandler;
    this.durationLoadedHandler = options.durationLoadedHandler;
    this.playHandler = options.playHandler;
    this.pauseHandler = options.pauseHandler;
    this.timeUpdateHandler = options.timeUpdateHandler;
    this.onFinish = options.onFinish;


    this.transitionTime = 0;
    if (options.transitionTime != null && typeof(options.transitionTime) == "number") {
        this.transitionTime = options.transitionTime;
    }

    this.classString = ""; //option= additional class tags
    if (options.classString != null && typeof(options.classString) == "string") {
        this.classString = options.classString;
    }

    this.autoReload = true;
    if (options.autoReload != null && typeof(options.autoReload) == "boolean") {
        this.autoReload = options.autoReload;
    }

    this.renderObject = null;
    this.currentClipIndex = 0;
    this.isVideoReady = false;
    this.videoObjects = [];
    this.isPlaying = false;
    this.sendPlayEvent = true; // we set this to true because we want the initial play event to fire
    this.sendPauseEvent = false; // we set this to false because we don't know if the first pause will be done by the user or by the "system"
    this.durationLoadingVideo = null; // we use this variable to hold videos that we are only loading metadata for in order to calculate the total duration
    this._duration;

    // --------------------------------------------------
    // "public" methods
    // --------------------------------------------------

    this.play = function () {
        if (self.isVideoReady) {
            self.sendPlayEvent = true;
            self.videoObjects[self.currentClipIndex].style.opacity = "1";
            self.videoObjects[self.currentClipIndex].play();
            this.isPlaying = true;
        } else {
            this.onLoadError("video not ready");
        }

    }

    this.pause = function () {
        if (!this.videoObjects[self.currentClipIndex].paused) {
            self.sendPauseEvent = true;
            this.videoObjects[self.currentClipIndex].pause();
        }
        if ((self.currentClipIndex + 1) < self.videoObjects.length) {
            // sometimes the user will try to pause right in the middle of a transition, so we should make sure that the next video is also paused
            if(!this.videoObjects[self.currentClipIndex + 1].paused) {
                this.videoObjects[self.currentClipIndex + 1].pause();
            }
        }
        this.isPlaying = false;
    }

    this.togglePlayPause = function () {
        if (this.isPlaying)
        {
            self.pause();
        }
        else
        {
            self.play();
        }
    }

    this.loadDuration = function () {
        for (var i = 0; i < self.renderObject.EDL.length; i++) {
            if (!self.renderObject.EDL[i].endTime) {                
                self.durationLoadingVideo = createVideo(i, "metadata");
                return; // return so that we don't call onDurationLoaded                
            }
        }

        self.onDurationLoaded();
    }

    this.duration = function() {
        if (!self._duration)
        {
            var duration = 0; 
            for (var i = 0; i < self.renderObject.EDL.length; i++) {
                var endTime;
                if (self.renderObject.EDL[i].endTime)
                {
                    endTime = self.renderObject.EDL[i].endTime;
                }
                else {
                    console.log('ERROR: duration has not yet been calculated.  You must first call player.loadDuration(), or set the "automatically loads duration" option to true when creating the player object.');
                    return null;
                }

                var startTime = 0;
                if (self.renderObject.EDL[i].startTime)
                {
                    startTime = self.renderObject.EDL[i].startTime;
                }

                duration += endTime - startTime;
            }
            self._duration = duration;
        }

        return self._duration;
    }

    this.currentTime = function () {
        var previousDuration = 0;
        for (var i = 0; i < self.currentClipIndex; i++)
        {
            var startTime = self.renderObject.EDL[i].startTime ? self.renderObject.EDL[i].startTime : 0;

            if (!self.renderObject.EDL[i].endTime) {
                console.log('ERROR trying to determine current time');
                return null;
            }

            var endTime = self.renderObject.EDL[i].endTime;

            previousDuration += (endTime - startTime);
        }

        var clipStart = self.renderObject.EDL[self.currentClipIndex].startTime ? self.renderObject.EDL[self.currentClipIndex].startTime : 0;
        return previousDuration + (self.videoObjects[self.currentClipIndex].currentTime - clipStart);
    }

    this.seekToSeconds = function(desiredSeconds) {
        // check to see if the seek is possible, and whether it is a valid request or not
        var duration = self.duration();
        if (duration != null)
        {
            if (desiredSeconds < 0 || desiredSeconds > duration)
            {
                console.log("Requested seek time is out of range");
                return;
            }
        } else {
            console.log("A SeekToSeconds request cannot be made until the duration has been loaded.")
            return;
        }
        
        // determine what clip the desired seconds are in
        var currentCalculatedDuration = 0;
        var desiredClipIndex;
        for (var i = 0; i < self.renderObject.EDL.length; i++)
        {
            var startTime = self.renderObject.EDL[i].startTime ? self.renderObject.EDL[i].startTime : 0;
            var clipLength = (self.renderObject.EDL[i].endTime - startTime);

            if (desiredSeconds < (currentCalculatedDuration + clipLength)) {
                desiredClipIndex = i;
                break;
            }

            currentCalculatedDuration += clipLength;
        }

        // check to make sure that we (hopefully) correctly determined the clip to seek to
        if (desiredClipIndex == null)
        {
            console.log("ERROR attempting to seek to requested time");
        }

        // determine what time in the determined clip we must seek to
        var desiredClipTime = desiredSeconds - currentCalculatedDuration;
        desiredClipTime += self.renderObject.EDL[desiredClipIndex].startTime ? self.renderObject.EDL[desiredClipIndex].startTime : 0;

        // if the requested index is the currently playing video, just reset the time to the start time
        if (desiredClipIndex == self.currentClipIndex)
        {
            self.videoObjects[desiredClipIndex].currentTime = desiredClipTime;
            
        }
        else
        {
            self.currentClipIndex = desiredClipIndex;

            // remove all videos
            while (self.videoContainer.lastChild) {
                self.videoContainer.removeChild(self.videoContainer.lastChild);
            }
            for (var i = 0; i < self.renderObject.EDL.length; i++) {
                self.videoObjects[i] = null; // delete the video completely
            }

            // load the initial videos (we need to move this to another method!)
            self.loadInitialElementsStartingAt(desiredClipIndex);

            // set the seek time
            self.videoObjects[desiredClipIndex].currentTime = desiredClipTime;

            self.videoObjects[desiredClipIndex].style.opacity = 1;
        }
    }

    this.seekToClipIndex = function(clipIndex) {
        // check to see if the seek request is valid or no
        if (clipIndex < 0 || clipIndex >= self.renderObject.EDL.length)
        {
            console.log("Requested index out of range");
            return;
        }
        
        // if the requested index is the currently playing video, just reset the time to the start time
        if (clipIndex == self.currentClipIndex)
        {
            var startTime = self.renderObject.EDL[clipIndex].startTime ? self.renderObject.EDL[clipIndex].startTime : 0;

            self.videoObjects[clipIndex].currentTime = startTime;
        }
        else
        {
            self.currentClipIndex = clipIndex;

            // remove all videos
            while (self.videoContainer.lastChild) {
                self.videoContainer.removeChild(self.videoContainer.lastChild);
            }
            for (var i = 0; i < self.renderObject.EDL.length; i++) {
                self.videoObjects[i] = null; // delete the video completely
            }

            // load the initial videos (we need to move this to another method!)
            self.loadInitialElementsStartingAt(clipIndex);

            self.videoObjects[clipIndex].style.opacity = 1;
        }
    }

    // =================================================
    // "private" methods
    // =================================================

    this.createVideo = function(clipIndex, preloadStyle) {

        var content = this.renderObject.EDL[clipIndex];

        var videoElement = document.createElement('video');
        videoElement.setAttribute('id', self.playerID + "-" + clipIndex);
        videoElement.setAttribute('class', self.classString);

        var timeString = "#t=";
        timeString += content.startTime;
        if (content.endTime) {
            timeString += "," + content.endTime;
        }
        if (timeString == "#t=") {
            timeString = "";
        }
        videoElement.setAttribute('src', content.url + timeString);

        preloadStyle = (typeof preloadStyle == "undefined") ? "auto" : preloadStyle;
        videoElement.setAttribute('preload', preloadStyle);

        videoElement.style.position = "absolute";
        videoElement.style.opacity = "0";
        videoElement.style.webkitTransition = self.transitionTime + "s";

        videoElement.addEventListener("loadedmetadata", self.onMetadataLoaded);
        videoElement.addEventListener("loadeddata", self.onVideoReady);
        videoElement.addEventListener("play", self.onPlay);
        videoElement.addEventListener("pause", self.onPause);
        videoElement.addEventListener("timeupdate", self.onTimeUpdate);

        return videoElement;
    }  

    this.loadInitialElementsStartingAt = function(clipIndex)
    {
        for (var i = clipIndex; i < (clipIndex + 2); i++) {
            self.videoObjects[i] = self.createVideo(i);
        }

        for (var i = clipIndex; i < (clipIndex + 2); i++)
        {
            self.videoContainer.insertBefore(self.videoObjects[i], self.videoContainer.firstChild);
        }
    }

    this.onClipStartedHandler = function() {
        if (self.clipStartedHandler) {
            self.clipStartedHandler();
        }
    }

    this.onDurationLoaded = function() {
        if (self.durationLoadedHandler) {
            self.durationLoadedHandler();
        }
    }

    // =================================
    // internal video element callbacks
    // =================================

    this.onMetadataLoaded = function() {
        var elementID = this.id;
        var clipID = parseInt(elementID.replace(self.playerID + "-", ""));

        if (clipID == null || clipID < 0) {
            self.onLoadError("Something wrong with a video element...");
            return;
        }

        // add the duration to the endTime of the render object, whether or not we are trying to get the duration of the whole video
        if (this.duration && !self.renderObject.EDL[clipID].endTime) {
            self.renderObject.EDL[clipID].endTime = this.duration;
        }

        // check to see if the purpose of this video is to just grab the duration
        if (this == self.durationLoadingVideo)
        {
            // check to see if we might need to load the duration for another clip
            if (clipID != (self.renderObject.EDL.length - 1))
            {
                // go throught and create the next video to load metadata
                for (var i = 0; i < self.renderObject.EDL.length; i++)
                {
                    if (!self.renderObject.EDL[i].endTime)
                    {
                        self.durationLoadingVideo = createVideo(i, "metadata");
                        return; // return so that we don't call onDurationLoaded
                    }

                }
            }
            
            delete self.durationLoadingVideo;
            self.durationLoadingVideo = null;
            self.onDurationLoaded();
        }

    }

    this.onVideoReady = function() {

        var elementId = this.id;
        var clipID = parseInt(elementId.replace(self.playerID + "-", ""));

        console.log('element on video ready', clipID);

        if (clipID == null || clipID < 0) {
            self.onLoadError("Something wrong with video element...");
            return;
        }

        if (clipID == 0) {
            self.isVideoReady = true;
            document.getElementById(self.playerID + "-" + self.currentClipIndex).style.opacity = "1";
            self.onReady();
        }

        if (clipID == self.currentClipIndex && self.isPlaying)
        {
            self.videoObjects[clipID].play();
        }
    }

    this.onPlay = function() {
        if (self.playHandler && self.sendPlayEvent)
        {
            self.playHandler();
        }
        self.sendPlayEvent = false;
    }

    this.onPause = function() {
        // this function is called when the video reaches the point in time when it is supposed to stop, or when it reaches the end of the video

        if (self.pauseHandler && self.sendPauseEvent)
        {
            self.pauseHandler();
        }
        self.sendPauseEvent = false;

        var videoId = parseInt(this.id.replace(self.playerID + "-", ""));
        if (self.renderObject.EDL[videoId].endTime <= this.currentTime)
        {
            this.style.opacity = "0"; 
            this.remove(); // should move to a transition handler
            self.videoObjects[self.currentClipIndex] = null; // with a large number of videos, if we don't do this then the video playback will eventually start to hitch

            self.currentClipIndex++;

            if (self.renderObject.EDL.length > self.currentClipIndex) {
                self.videoObjects[self.currentClipIndex].style.opacity = "1";
                self.videoObjects[self.currentClipIndex].play();

                if (self.renderObject.EDL.length > self.currentClipIndex + 1) {
                    if (!self.videoObjects[self.currentClipIndex + 1]) {
                        self.videoObjects[self.currentClipIndex + 1] = self.createVideo(self.currentClipIndex + 1);
                    }
                    self.videoContainer.insertBefore(self.videoObjects[self.currentClipIndex + 1], self.videoContainer.firstChild);
                }

            }
            else {
                self.isPlaying = false;
                if (self.onFinish) {
                    self.onFinish();
                }
                if (self.autoReload)
                {
                    self.loadInitialElementsStartingAt(0);
                }
                
            }

        }
    }

    this.onTimeUpdate = function() {
        // TODO:
        // 
        // check here for transitions stuff

        if (self.timeUpdateHandler) {
            self.timeUpdateHandler();
        }
    }

    // --------------------------------------------------------------------------------------------------
    // Load the video.
    // This section must come at the end, so that the methods that are referenced are defined beforehand.
    // ==================================================================================================

    this.renderObject = renderObject;

    if (this.renderObject == null) {
        this.onLoadError("Invalid Render Object");
        return;
    }

    if (options.autoLoadDuration) {
        this.loadDuration();
    }

    this.loadInitialElementsStartingAt(0);
}
