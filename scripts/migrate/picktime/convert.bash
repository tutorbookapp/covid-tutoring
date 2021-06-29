for f in *.xlsx; do ssconvert "$f" "${f%.xlsx}.csv"; done
