from flask import Flask, render_template, request	# for running the Flask server
import sys											# for obtaining command line arguments
import json											# for creating json objects to send to client

app = Flask(__name__)

@app.route('/')
def newsCombinator():
	return render_template('newsCombinator.html')

@app.route('/renderObjectForTimeAvailable')
def renderObjectForTimeAvailable():
	timeAvailable = request.args.get('t')
	print timeAvailable

	# perform some safety checks here to make sure the timeAvailable is a valid number

	# generate the render object containing the playlist
	renderObject = {}

	response = {'errorCode' : 0, 'renderObject' : renderObject}
	return json.dumps(response)

if __name__ == '__main__':
	if len(sys.argv) != 2:
		print "USAGE: python newsCombinator.py [port #]"
	else:
		app.run(port = int(sys.argv[1])) # run on the specified port number

