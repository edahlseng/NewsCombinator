// TODO:
//
// future: better support for transitions, 
// adding support for a scrubber through the whole concat ro
// etc.
// fullscreen support
// better controls
// play & pause callbacks


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

    // --------------------------------------------------
    // "public" methods
    // --------------------------------------------------

    this.play = function () {
        if (self.videoObjects[self.currentVideoIndex].readyState > 1) {
            self.videoObjects[self.currentVideoIndex].style.opacity = "1";
            self.videoObjects[self.currentVideoIndex].play();
            this.isVideoPlaying = true;
        } else {
            this.onLoadError("video not ready");
            self.videoObjects[self.currentVideoIndex].load();
        }
    }

    this.pause = function () {
        if (!this.videoObjects[self.currentVideoIndex].paused) {
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

    this.duration = function() {
        // TODO:
        //
        // implement this method
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

            // else, remove all videos, load the clip that we want
            // while (self.videoContainer.lastChild)
            // {
            //     // self.videoContainer.removeChild(self.videoContainer.lastChild);
            // }

            for (var i = clipIndex; i < self.renderObj.EDL.length; i++) {
                self.videoObjects[i].style.opacity = 0;
                // self.videoContainer.insertBefore(self.videoObjects[i], self.videoContainer.firstChild);
            };

            self.videoObjects[clipIndex].load();
            if ((clipIndex + 1) < self.videoObjects.length) {
                self.videoObjects[clipIndex + 1].load();
                console.log(self.videoObjects[clipIndex + 1]);
            }

            self.videoObjects[clipIndex].style.opacity = 1;
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

    this.createVideo = function (clipIndex) {

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

        // videoElement.setAttribute('controls', true);
        videoElement.setAttribute('preload', "none");

        videoElement.style.position = "absolute";
        videoElement.style.opacity = "0";
        videoElement.style.webkitTransition = self.transitionTime + "s";

        videoElement.addEventListener("loadedmetadata", self.onMetadataLoaded);
        videoElement.addEventListener("loadeddata", self.onVideoReady);
        videoElement.addEventListener("play", self.onPlay);
        videoElement.addEventListener("pause", self.onPause);
        videoElement.addEventListener("timeupdate", self.onTimeUpdate);

        self.videoObjects[clipIndex] = videoElement;
    }  


    // =================================
    // internal video element callbacks
    // =================================

    this.onMetadataLoaded = function() {
                
        var elementId = this.id;
        var videoId = parseInt(elementId.replace("video-" + self.elementId + "-", ""));

        if (videoId == null || videoId < 0) {
            self.onLoadError("Something wrong with video element...");
            return;
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

        if (self.isVideoPlaying && videoId == self.currentVideoIndex)
        {
            // when seeking, we may need to play the first video element
            self.videoObjects[videoId].play();
        }
    }

    this.onPlay = function() {
        console.log("onPlay");
    }

    this.onPause = function() {
        // this function is called when the video reaches the point in time when it is supposed to stop, or when it reaches the end of the video

        console.log("onPause");
        // console.log ("currentVideoIndex = " + self.currentVideoIndex); 
        // console.log ("self.renderObj.EDL.length= " + self.renderObj.EDL.length);
        // console.log ("self.renderObj.EDL[self.currentVideoIndex].endTime= " + self.renderObj.EDL[self.currentVideoIndex].endTime); 
        // console.log ("this.currentTime = " + self.currentTime());
        // console.log ("video currentTime = " + document.getElementById("video-" + self.elementId + "-" + self.currentVideoIndex).currentTime);

        var videoId = parseInt(this.id.replace("video-" + self.elementId + "-", ""));
        if (self.renderObj.EDL[videoId].endTime <= this.currentTime) {
 
            self.currentVideoIndex++;

            this.style.opacity = "0"; 
            // this.remove(); // should move to a transition handler

            if (self.renderObj.EDL.length > self.currentVideoIndex) {
                var videoElement2 = self.videoObjects[self.currentVideoIndex];
                videoElement2.load();
                videoElement2.style.opacity = "1";
                self.videoObjects[self.currentVideoIndex].play();

                if (self.renderObj.EDL.length > self.currentVideoIndex + 1) {
                    self.videoObjects[self.currentVideoIndex + 1].load();
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

    for (var i = 0; i < self.renderObj.EDL.length; i++) {
        self.createVideo(i);
        self.videoContainer.insertBefore(self.videoObjects[i], self.videoContainer.firstChild);
    };

    // I don't know if this can be moved up before the methods or not
    // this.loadVideoElement(0); // what is this for????
    this.videoObjects[0].load();
    this.videoObjects[1].load();

    //--------------------------------------------------
}
