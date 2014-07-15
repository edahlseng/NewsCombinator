// TODO:
//
// future: better support for transitions, 
// adding support for a scrubber through the whole concat
// fullscreen support
// better controls
// reimplement autoreload feature


function UMVideoPlayer(wrapperId, renderObject, options) {
    //to note: clips 1 sec or less experience a delay, need to optimize.
    //option to load X number of videos in advance to adjust accordingly

    var self = this;

    this.videoContainer = document.getElementById(wrapperId);

    //options
    this.onReady = options.onReady;
    this.onLoadError = options.onLoadError;
    this.onRenderObjectTimeUpdate = options.onRenderObjectTimeUpdate;
    this.onFinish = options.onFinish;
    this.durationLoadedHandler = options.durationLoadedHandler;
    this.playHandler = options.playHandler;
    this.pauseHandler = options.pauseHandler;

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

    this.renderObj = null; // change to renderObject naming
    this.currentVideoIndex = 0; // change to currentClipIndex
    this.isVideoReady = false;
    this.videoObjects = [];
    this.renderObjectTime = 0;
    this.contentTime = [];
    this.isVideoPlaying = false; // change name to isPlaying
    this.sendPlayEvent = true; // we set this to true because we want the initial play event to fire
    this.sendPauseEvent = false; // we set this to false because we don't know if the first pause will be done by the user or by the "system"
    this.durationLoadingVideo = null; // we use this variable to hold videos that we are only loading metadata for in order to calculate the total duration

    // --------------------------------------------------
    // "public" methods
    // --------------------------------------------------

    this.play = function () {
        if (self.isVideoReady) {
            self.sendPlayEvent = true;
            self.videoObjects[self.currentVideoIndex].style.opacity = "1";
            self.videoObjects[self.currentVideoIndex].play();
            this.isVideoPlaying = true;
        } else {
            this.onLoadError("video not ready");
        }

    }

    this.pause = function () {
        if (!this.videoObjects[self.currentVideoIndex].paused) {
            self.sendPauseEvent = true;
            this.videoObjects[self.currentVideoIndex].pause();
        }
        if ((self.currentVideoIndex + 1) < self.videoObjects.length) {
            // sometimes the user will try to pause right in the middle of a transition, so we should make sure that the next video is also paused
            if(!this.videoObjects[self.currentVideoIndex + 1].paused) {
                this.videoObjects[self.currentVideoIndex + 1].pause();
            }
        }
        this.isVideoPlaying = false;
    }

    this.togglePlayPause = function () {
        if (this.isVideoPlaying)
        {
            self.pause();
        }
        else
        {
            self.play();
        }
    }

    this.loadDuration = function () {
        for (var i = 0; i < self.renderObj.EDL.length; i++) {
            if (!self.renderObj.EDL[i].endTime) {                
                self.durationLoadingVideo = createVideo(i, "metadata");
                return; // return so that we don't call onDurationLoaded                
            }
        }

        self.onDurationLoaded();
    }

    this.duration = function() {
        var duration = 0; 
        for (var i = 0; i < self.renderObj.EDL.length; i++) {
            var endTime;
            if (self.renderObj.EDL[i].endTime)
            {
                endTime = self.renderObj.EDL[i].endTime;
            }
            else {
                console.log('ERROR: duration has not yet been calculated.  You must first call player.loadDuration(), or set the "automatically loads duration" option to true when creating the player object.');
                break;
            }

            var startTime = 0;
            if (self.renderObj.EDL[i].startTime)
            {
                startTime = self.renderObj.EDL[i].startTime;
            }

            duration += endTime - startTime;
        }

        return duration;
    }

    this.currentTime = function () {
        // return this.renderObjectTime;
        // TODO:
        //
        // implement this method
    }

    this.seekToTime = function(time) {
        // TODO:
        //
        // implement this method
    }

    this.seekToClipIndex = function(clipIndex) {
        if (clipIndex < 0 || clipIndex >= self.renderObj.EDL.length)
        {
            console.log("Requested index out of range");
            return;
        }
        
        // if the requested index is the currently playing video, just reset the time to the start time
        if (clipIndex == self.currentVideoIndex)
        {
            var videoElement = this.videoObjects[clipIndex];
            var startTime = 0;
            if (self.renderObj.EDL[clipIndex].startTime)
            {
                startTime = self.renderObj.EDL[clipIndex].startTime;
            }
            videoElement.currentTime = startTime;
            // we might need to play here...
        }
        else
        {
            self.currentVideoIndex = clipIndex;

            //else, remove all videos, load the clip that we want
            while (self.videoContainer.lastChild)
            {
                self.videoContainer.removeChild(self.videoContainer.lastChild);
            }

            for (var i = clipIndex; i < self.renderObj.EDL.length; i++) {
                self.videoObjects[i].style.opacity = 0;
            };

            if (!self.videoObjects[clipIndex]) {
                self.createVideo[clipIndex];
            }
            self.videoContainer.insertBefore(self.videoObjects[clipIndex], self.videoContainer.firstChild);
            if ((clipIndex + 1) < self.videoObjects.length) {
                if (!self.videoObjects[clipIndex + 1]) {
                    self.createVideo[clipIndex + 1];
                }
                self.videoContainer.insertBefore(self.videoObjects[clipIndex + 1], self.videoContainer.firstChild);
            }

            self.videoObjects[clipIndex].style.opacity = 1;

            if (self.isVideoPlaying && videoId == self.currentVideoIndex)
            {
                // when seeking, we may need to play the first video element
                self.videoObjects[videoId].play();
            }
        }
    }

    // =================================================
    // "private" methods
    // =================================================

    this.generateId = function(num) {
        var text = "";
        var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

        for( var i=0; i < num; i++ ) {
            text += possible.charAt(Math.floor(Math.random() * possible.length));
        }

        return text;
    }

    this.createVideo = function (clipIndex, preloadStyle) {

        var content = this.renderObj.EDL[clipIndex];

        var videoElement = document.createElement('video');
        videoElement.setAttribute('id', "video-" + self.elementId + "-" + clipIndex);
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

    this.onDurationLoaded = function () {
        if (self.durationLoadedHandler) {
            self.durationLoadedHandler();
        }
    }

    // =================================
    // internal video element callbacks
    // =================================

    this.onMetadataLoaded = function() {
        var elementId = this.id;
        var videoId = parseInt(elementId.replace("video-" + self.elementId + "-", ""));

        if (videoId == null || videoId < 0) {
            self.onLoadError("Something wrong with a video element...");
            return;
        }

        // check to see if the purpose of this video is to just grab the duration
        if (this == self.durationLoadingVideo)
        {
            // add the endTime to the render object
            if (this.duration) {
                self.renderObj.EDL[videoID].endTime = this.duration;
            } else {
                self.onLoadError("At least one of the clips is preventing the duration from being fully calculated.")
            }

            // check to see if we might need to load the duration for another clip
            if (videoID != (self.renderObj.EDL.length - 1))
            {
                // go throught and create the next video to load metadata
                for (var i = 0; i < self.renderObj.EDL.length; i++)
                {
                    if (!self.renderObj.EDL[i].endTime)
                    {
                        self.durationLoadingVideo = createVideo(i, "metadata");
                        return; // return so that we don't call onDurationLoaded
                    }

                }
            }
            
            delete self.durationLoadingVideo;
            self.durationLoadingVideo = undefined;
            self.onDurationLoaded();
        }

        // self.currentTime(self.renderObj.EDL[videoId].startTime);
        // self.contentTime[videoId] = self.renderObj.EDL[videoId].startTime;
    }

    this.onVideoReady = function() {

        var elementId = this.id;
        var videoId = parseInt(elementId.replace("video-" + self.elementId + "-", ""));

        console.log('element on video ready', videoId);

        if (videoId == null || videoId < 0) {
            self.onLoadError("Something wrong with video element...");
            return;
        }

        if (videoId == 0) {
            self.isVideoReady = true;
            document.getElementById("video-" + self.elementId + "-" + self.currentVideoIndex).style.opacity = "1";
            self.onReady();
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

        var videoId = parseInt(this.id.replace("video-" + self.elementId + "-", ""));
        if (self.renderObj.EDL[videoId].endTime <= this.currentTime)
        {
            this.style.opacity = "0"; 
            this.remove(); // should move to a transition handler
            self.videoObjects[self.currentVideoIndex] = null; // with a large number of videos, if we don't do this then the video playback will eventually start to hitch

            self.currentVideoIndex++;

            if (self.renderObj.EDL.length > self.currentVideoIndex) {
                self.videoObjects[self.currentVideoIndex].style.opacity = "1";
                self.videoObjects[self.currentVideoIndex].play();

                if (self.renderObj.EDL.length > self.currentVideoIndex + 1) {
                    if (!self.videoObjects[self.currentVideoIndex + 1]) {
                        self.videoObjects[self.currentVideoIndex + 1] = self.createVideo(self.currentVideoIndex + 1);
                    }
                    self.videoContainer.insertBefore(self.videoObjects[self.currentVideoIndex + 1], self.videoContainer.firstChild);
                }

            }
            else {
                self.isVideoPlaying = false;
                if (self.onFinish) {
                    self.onFinish();
                }
                if (self.autoReload)
                {
                    // TODO:
                    // 
                    // implement this feature
                }
                
            }

        }
    }

    this.onTimeUpdate = function() {
        // TODO:
        // 
        // implement this
    }

    //--------------------------------------------------
    // I think that some of this might be able to be moved up before the methods

    this.renderObj = renderObject;

    if (this.renderObj == null) {
        this.onLoadError("Invalid Render Object");
        return;
    }

    if (this.automaticallyLoadDuration) {
        this.loadDuration();
    }

    for (var i = 0; i < 2; i++) {
        self.videoObjects[i] = self.createVideo(i);
    };

    // I don't know if this can be moved up before the methods or not
    // this.loadVideoElement(0); // what is this for????
    self.videoContainer.insertBefore(self.videoObjects[0], self.videoContainer.firstChild);
    self.videoContainer.insertBefore(self.videoObjects[1], self.videoContainer.firstChild);

    //--------------------------------------------------
}
