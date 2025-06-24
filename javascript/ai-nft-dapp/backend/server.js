// Import required modules
const express = require('express');
const app = express();

// Define planet data
const planets = [
    {
        id: 1,
        name: 'Earth',
        description: 'The third planet from the Sun and the only known astronomical object known to harbor life.',
        image: 'ipfs://bafkreibd6mnqim73brdrzmk26tdsxr75nx75spwuzjzmazdpc77ckuxxym'
    },
    {
        id: 2,
        name: 'Mars',
        description: 'The fourth planet from the Sun and the second-smallest planet in the Solar System.',
        image: 'ipfs://bafkreieirb4w2naao6wdeauujx4ety5chxx225cg32om3nvxd6qki6xdyu'
    }
];
// Endpoint to get planet details
app.get('/planet/:name', (req, res) => {
    const planetName = req.params.name.toLowerCase();
    const planet = planets[planetName];

    if (planet) {
        res.json(planet);
    } else {
        res.status(404).json({ error: 'Planet not found' });
    }
});

// Start the server
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});