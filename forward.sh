sudo node app.js forward; code=$(echo $?;); while test $code -ne 0; do sudo node app.js forward;code=$(echo $?;); done
