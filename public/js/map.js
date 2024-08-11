var map = L.map('map').setView([22.53285370752713, 79.01367187500001], 5);


        L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
        }).addTo(map);

        var marker, circle;


        map.on('click', function (e) {
            // Fetch the latitude and longitude from the event object
            var lat = e.latlng.lat;
            var lng = e.latlng.lng;


            // Remove the existing marker and circle if they exist
            if (marker) {
                map.removeLayer(marker);
            }
            if (circle) {
                map.removeLayer(circle);
            }


            // Add a new marker and circle
            // marker = L.marker([lat, lng]).addTo(map);
            circle = L.circle([lat, lng], {
                color: 'red',
                fillColor: '#f03',
                fillOpacity: 0.5,
                radius: 50000
            }).addTo(map);
           
            document.getElementById("p1").innerHTML = lat + " " ;
            document.getElementById("p2").innerHTML = lng+" ";


            const latitude =lat;
            const longitude =lng;
            const queryString = `?lat=${encodeURIComponent(latitude)}&lon=${encodeURIComponent(longitude)}`;
            window.location.href = `http://localhost:8000/fetch-data${queryString}`;
        });










