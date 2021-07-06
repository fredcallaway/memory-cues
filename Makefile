dev: export FLASK_ENV=development
dev:
	herokupy bin/herokuapp.py &
	open -a 'Google Chrome' http://0.0.0.0:22362 
	fg