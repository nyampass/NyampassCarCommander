sudo node app.js back; code=$(echo $?;); while test $code -ne 0; do sudo node app.js back;code=$(echo $?;); done
