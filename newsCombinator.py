from flask import Flask, render_template, request	# for running the Flask server
import sys											# for obtaining command line arguments
import json											# for creating json objects to send to client
import math											# for performing calculations
import urllib2										# for querying other sites for content

app = Flask(__name__)

@app.route('/')
def newsCombinator():
	return render_template('newsCombinator.html')

@app.route('/renderObjectForTimeAvailable')
def renderObjectForTimeAvailable():
	timeAvailable = request.args.get('t')
	errorCode = 0

	# perform some safety checks here to make sure the timeAvailable is a valid number
	if timeAvailable == "few":
		timeAvailable = math.sqrt(10)
	else:
		timeAvailable = float(timeAvailable)
	timeAvailable = max(0.0, timeAvailable)
	timeAvailable = min(60.0, timeAvailable)

	recentVideos = urllib2.urlopen("http://um-helios.media.mit.edu/getVideos?sort=dt&limit=100").read()
	
	print recentVideos

	# generate the render object containing the playlist
	renderObject = {
            'title': 'Ultimate Media Remix',
            'EDL': [{
                'url': "http://um-static.media.mit.edu/UU-0MrczERAe4/UU-0MrczERAe4_low.mp4",
                'startTime': 2.0,
                'endTime': 5.0,
            }, {
                'url': "http://um-static.media.mit.edu/UU-2QqLqnxXJc/UU-2QqLqnxXJc_low.mp4",              
                'startTime': 2.0,
                'endTime': 4.0,
            }, {
                'url': "http://um-static.media.mit.edu/UU-0MrczERAe4/UU-0MrczERAe4_low.mp4",
                'startTime': 54.0,
                'endTime': 56.0,
            }, {
                'url': "http://um-static.media.mit.edu/UU-2QqLqnxXJc/UU-2QqLqnxXJc_low.mp4",
                'startTime': 10.0,
                'endTime': 13.0,
            }, {
                'url': "http://um-static.media.mit.edu/UU-0MrczERAe4/UU-0MrczERAe4_low.mp4",
                'startTime': 34.0,
                'endTime': 37.0,
            }],
        }

	response = {'errorCode' : errorCode, 'renderObject' : renderObject}
	return json.dumps(response)

if __name__ == '__main__':
	if len(sys.argv) != 2:
		print "USAGE: python newsCombinator.py [port #]"
	else:
		app.run(port = int(sys.argv[1])) # run on the specified port number

