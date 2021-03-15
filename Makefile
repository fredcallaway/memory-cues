dev: export FLASK_ENV=development
dev:
	open -a 'Google Chrome' http://0.0.0.0:22362 
	herokupy bin/herokuapp.py