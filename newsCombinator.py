from flask import Flask, render_template	# for running the Flask server
import sys									# for obtaining command line arguments

app = Flask(__name__)

@app.route('/')
def newsCombinator():
	return render_template('newsCombinator.html')

if __name__ == '__main__':
	if len(sys.argv) != 2:
		print "USAGE: python newsCombinator.py [port #]"
	else:
		app.run(port = int(sys.argv[1])) # run on the specified port number

