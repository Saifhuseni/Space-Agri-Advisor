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














function getCityState(lat, lng) {
            const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=10&addressdetails=1`;
         
            fetch(url)
              .then(response => response.json())
              .then(data => {
                console.log(data);  // Log the entire response to inspect it
         
                // Extract city and state
                const city = data.address.city || data.address.town || data.address.village;
                const state = data.address.state;
         
                if (city && state) {
                  // Display city and state in the HTML
                  document.getElementById('city').innerText = city;
                  document.getElementById('state').innerText = state;
                } else {
                  console.error('City or State not found in the response');
                }
              })
              .catch(error => console.error('Error:', error));
          }

