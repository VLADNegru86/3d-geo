import { db } from "@workspace/db";
import {
  categoriesTable,
  resourcesTable,
  mapPointsTable,
  stratigraphicUnitsTable,
} from "@workspace/db/schema";

async function seed() {
  console.log("Seeding database...");

  // Categories
  const categories = await db
    .insert(categoriesTable)
    .values([
      {
        name: "Geological Maps",
        slug: "geological-maps",
        description: "2D and 3D geological maps of various regions",
        iconName: "Map",
        color: "#2563eb",
      },
      {
        name: "Stratigraphy",
        slug: "stratigraphy",
        description: "Stratigraphic columns and geological time records",
        iconName: "Layers",
        color: "#7c3aed",
      },
      {
        name: "Petrology",
        slug: "petrology",
        description: "Rock and mineral sample data and analyses",
        iconName: "Gem",
        color: "#db2777",
      },
      {
        name: "Geophysics",
        slug: "geophysics",
        description: "Seismic, gravity, and magnetic surveys",
        iconName: "Activity",
        color: "#d97706",
      },
      {
        name: "Hydrogeology",
        slug: "hydrogeology",
        description: "Groundwater and hydrological data",
        iconName: "Droplets",
        color: "#0891b2",
      },
      {
        name: "Paleontology",
        slug: "paleontology",
        description: "Fossil records and paleontological studies",
        iconName: "Bone",
        color: "#65a30d",
      },
      {
        name: "Remote Sensing",
        slug: "remote-sensing",
        description: "Satellite and aerial imagery analysis",
        iconName: "Satellite",
        color: "#dc2626",
      },
      {
        name: "Geochemistry",
        slug: "geochemistry",
        description: "Chemical composition of geological materials",
        iconName: "FlaskConical",
        color: "#059669",
      },
    ])
    .returning()
    .onConflictDoNothing();

  console.log(`Inserted ${categories.length} categories`);

  // Resources
  const resources = await db
    .insert(resourcesTable)
    .values([
      {
        title: "Geological Map of Romania 1:200,000",
        description:
          "Comprehensive geological map covering the entire Romanian territory including the Carpathian Mountains, Transylvanian Basin and the Pannonian Basin. Includes lithological and structural data.",
        type: "map",
        categoryId: categories[0]?.id,
        region: "Romania",
        author: "Romanian Geological Survey",
        year: 2019,
        tags: ["romania", "carpathians", "stratigraphy", "tectonics"],
        downloadCount: 1240,
      },
      {
        title: "Carpathian Stratigraphic Atlas",
        description:
          "Detailed stratigraphic analysis of the Carpathian region covering Mesozoic and Cenozoic formations. Includes biostratigraphic correlations across multiple sections.",
        type: "publication",
        categoryId: categories[1]?.id,
        region: "Carpathians",
        author: "Popescu, A. & Ionescu, B.",
        year: 2021,
        tags: ["stratigraphy", "mesozoic", "cenozoic", "biostratigraphy"],
        downloadCount: 856,
      },
      {
        title: "Transylvania Seismic Survey Dataset",
        description:
          "Full dataset from the 2018 deep seismic survey of the Transylvanian Basin. Includes reflection seismic profiles, velocity models, and interpreted cross-sections.",
        type: "dataset",
        categoryId: categories[3]?.id,
        region: "Transylvania",
        author: "Geophysical Institute Bucharest",
        year: 2020,
        tags: ["seismic", "transylvania", "basin", "geophysics"],
        downloadCount: 432,
      },
      {
        title: "Apuseni Mountains 3D Geological Model",
        description:
          "Three-dimensional geological model of the Apuseni Mountains. Built using borehole data, geological maps, and geophysical surveys. Available in multiple formats.",
        type: "model3d",
        categoryId: categories[0]?.id,
        region: "Apuseni Mountains",
        author: "GeoResearch Institute Cluj",
        year: 2022,
        tags: ["3d-model", "apuseni", "ore-deposits", "structural-geology"],
        downloadCount: 678,
      },
      {
        title: "Dobrogea Paleozoic Fossils Collection",
        description:
          "Comprehensive catalog of Paleozoic fossils from Dobrogea region. Includes brachiopods, trilobites, and corals from Devonian and Carboniferous formations.",
        type: "dataset",
        categoryId: categories[5]?.id,
        region: "Dobrogea",
        author: "Paleontology Dept, University of Bucharest",
        year: 2020,
        tags: ["paleontology", "dobrogea", "paleozoic", "fossils"],
        downloadCount: 321,
      },
      {
        title: "Pannonian Basin Hydrogeological Report",
        description:
          "Assessment of groundwater resources in the Pannonian Basin sector within Romania. Includes aquifer characterization, recharge rates, and quality parameters.",
        type: "report",
        categoryId: categories[4]?.id,
        region: "Western Romania",
        author: "National Water Authority",
        year: 2021,
        tags: ["hydrogeology", "pannonian", "groundwater", "aquifer"],
        downloadCount: 512,
      },
      {
        title: "Moesian Platform Geochemical Survey",
        description:
          "Systematic geochemical sampling of the Moesian Platform. Includes major and trace element analyses of surface and subsurface samples from 450 locations.",
        type: "dataset",
        categoryId: categories[7]?.id,
        region: "Southern Romania",
        author: "National Geological Institute",
        year: 2019,
        tags: ["geochemistry", "moesian", "trace-elements", "survey"],
        downloadCount: 289,
      },
      {
        title: "Bucegi Mountains Geological Map 1:50,000",
        description:
          "Detailed geological map of the Bucegi Mountains area. High resolution mapping of Jurassic-Cretaceous carbonate successions and their structural relationships.",
        type: "map",
        categoryId: categories[0]?.id,
        region: "Bucegi Mountains",
        author: "Geological Survey of Romania",
        year: 2018,
        tags: ["bucegi", "cretaceous", "jurassic", "carbonates"],
        downloadCount: 934,
      },
      {
        title: "Global Tectonic Setting of SE Europe",
        description:
          "Publication on the regional tectonic framework of Southeastern Europe. Covers Alpine, Carpathian, and Balkan orogenic belts with focus on geodynamic evolution.",
        type: "publication",
        categoryId: categories[0]?.id,
        region: "Southeast Europe",
        author: "Stefanescu, M. et al.",
        year: 2022,
        tags: ["tectonics", "europe", "geodynamics", "carpathians"],
        downloadCount: 1502,
      },
      {
        title: "Satellite Imagery Geological Interpretation",
        description:
          "Remote sensing analysis of geological structures visible in Sentinel-2 and Landsat-8 imagery. Includes lineament mapping and alteration zones detection.",
        type: "image",
        categoryId: categories[6]?.id,
        region: "Romania",
        author: "Remote Sensing Lab, Bucharest",
        year: 2023,
        tags: ["remote-sensing", "satellite", "lineaments", "alteration"],
        downloadCount: 445,
      },
      {
        title: "Cretaceous Carbonate Petrology Atlas",
        description:
          "Petrographic atlas of Cretaceous carbonate rocks from the Southern Carpathians. Thin section images and geochemical data for 180 samples.",
        type: "publication",
        categoryId: categories[2]?.id,
        region: "Southern Carpathians",
        author: "Petrescu, I. & Dumitrescu, R.",
        year: 2020,
        tags: ["petrology", "carbonates", "cretaceous", "thin-sections"],
        downloadCount: 367,
      },
      {
        title: "Eastern Carpathian Seismicity Database",
        description:
          "Complete seismicity catalog for Eastern Carpathians from 1900-2023. Includes earthquake magnitudes, depths, focal mechanisms and historical records.",
        type: "dataset",
        categoryId: categories[3]?.id,
        region: "Eastern Carpathians",
        author: "National Institute for Earth Physics",
        year: 2023,
        tags: ["seismicity", "earthquakes", "vrancea", "focal-mechanisms"],
        downloadCount: 1876,
      },
    ])
    .returning()
    .onConflictDoNothing();

  console.log(`Inserted ${resources.length} resources`);

  // Map points
  const mapPoints = await db
    .insert(mapPointsTable)
    .values([
      {
        name: "Vrancea Seismic Zone",
        type: "seismic",
        latitude: 45.7,
        longitude: 26.7,
        description: "Major seismic zone in the Eastern Carpathians bend area",
        formation: "Eastern Carpathians",
        age: "Recent",
      },
      {
        name: "Rosia Montana",
        type: "mineral",
        latitude: 46.31,
        longitude: 23.1,
        description: "Historic gold-silver mining area in the Apuseni Mountains",
        formation: "Apuseni Mountains",
        age: "Miocene",
      },
      {
        name: "Bucegi Plateau",
        type: "outcrop",
        latitude: 45.4,
        longitude: 25.45,
        description: "Cretaceous limestone plateau with excellent exposures",
        formation: "Bucegi Formation",
        age: "Cretaceous",
      },
      {
        name: "Adamclisi",
        type: "outcrop",
        latitude: 44.0,
        longitude: 28.12,
        description: "Triassic-Jurassic carbonate outcrops in Dobrogea",
        formation: "Dobrogea Platform",
        age: "Triassic",
      },
      {
        name: "Danube Delta",
        type: "borehole",
        latitude: 45.15,
        longitude: 29.5,
        description: "Quaternary sediment accumulation, major drilling site",
        formation: "Quaternary",
        age: "Quaternary",
      },
      {
        name: "Sinaia Syncline",
        type: "structure",
        latitude: 45.35,
        longitude: 25.55,
        description: "Well-exposed Cretaceous flysch syncline",
        formation: "Sinaia Formation",
        age: "Cretaceous",
      },
      {
        name: "Harghita Volcanic Chain",
        type: "volcanic",
        latitude: 46.5,
        longitude: 25.6,
        description: "Neogene volcanic chain in Eastern Transylvania",
        formation: "Harghita Volcanic",
        age: "Neogene",
      },
      {
        name: "Retezat Pluton",
        type: "pluton",
        latitude: 45.37,
        longitude: 22.85,
        description: "Hercynian granite intrusion in Southern Carpathians",
        formation: "Retezat Granites",
        age: "Carboniferous",
      },
      {
        name: "Hunedoara Iron Ore",
        type: "mineral",
        latitude: 45.75,
        longitude: 22.9,
        description: "Skarn-type iron ore deposits associated with Mesozoic carbonates",
        formation: "Poiana Ruscă",
        age: "Triassic",
      },
      {
        name: "Baia Mare Mining District",
        type: "mineral",
        latitude: 47.65,
        longitude: 23.58,
        description: "Historic polymetallic mining district - Pb, Zn, Cu, Au",
        formation: "Gutai Mountains",
        age: "Miocene",
      },
      {
        name: "Turda Salt Mine",
        type: "mineral",
        latitude: 46.57,
        longitude: 23.79,
        description: "Historical salt mine in Miocene evaporite deposits",
        formation: "Transylvanian Basin",
        age: "Miocene",
      },
      {
        name: "Bicaz Gorge",
        type: "outcrop",
        latitude: 46.82,
        longitude: 25.88,
        description: "Spectacular Cretaceous limestone canyon",
        formation: "Hășmaș Mountains",
        age: "Cretaceous",
      },
    ])
    .returning()
    .onConflictDoNothing();

  console.log(`Inserted ${mapPoints.length} map points`);

  // Stratigraphic units
  const stratigraphicUnits = await db
    .insert(stratigraphicUnitsTable)
    .values([
      {
        name: "Hadean",
        era: "Precambrian",
        period: "Hadean",
        ageFrom: 4600,
        ageTo: 4000,
        color: "#4a1942",
        description: "Formation of Earth, no rock record preserved",
        region: "Global",
      },
      {
        name: "Archean",
        era: "Precambrian",
        period: "Archean",
        ageFrom: 4000,
        ageTo: 2500,
        color: "#6b1f5f",
        description: "Oldest crustal rocks, primitive life forms",
        region: "Global",
      },
      {
        name: "Proterozoic",
        era: "Precambrian",
        period: "Proterozoic",
        ageFrom: 2500,
        ageTo: 541,
        color: "#8b2a7a",
        description: "First eukaryotic life, atmospheric oxygenation",
        region: "Global",
      },
      {
        name: "Cambrian",
        era: "Paleozoic",
        period: "Cambrian",
        ageFrom: 541,
        ageTo: 485,
        color: "#7a6e99",
        description: "Cambrian explosion of multicellular life",
        region: "Global",
      },
      {
        name: "Ordovician",
        era: "Paleozoic",
        period: "Ordovician",
        ageFrom: 485,
        ageTo: 443,
        color: "#009270",
        description: "Marine invertebrate diversification",
        region: "Global",
      },
      {
        name: "Silurian",
        era: "Paleozoic",
        period: "Silurian",
        ageFrom: 443,
        ageTo: 419,
        color: "#b3e1b6",
        description: "First vascular plants on land",
        region: "Global",
      },
      {
        name: "Devonian",
        era: "Paleozoic",
        period: "Devonian",
        ageFrom: 419,
        ageTo: 359,
        color: "#cb8c37",
        description: "Age of Fishes, first forests",
        region: "Global",
      },
      {
        name: "Carboniferous",
        era: "Paleozoic",
        period: "Carboniferous",
        ageFrom: 359,
        ageTo: 299,
        color: "#67a599",
        description: "Coal swamp forests, first reptiles",
        region: "Global",
      },
      {
        name: "Permian",
        era: "Paleozoic",
        period: "Permian",
        ageFrom: 299,
        ageTo: 252,
        color: "#f04028",
        description: "Pangaea formation, mass extinction event",
        region: "Global",
      },
      {
        name: "Triassic",
        era: "Mesozoic",
        period: "Triassic",
        ageFrom: 252,
        ageTo: 201,
        color: "#812b92",
        description: "First dinosaurs and mammals appear",
        region: "Carpathians",
      },
      {
        name: "Jurassic",
        era: "Mesozoic",
        period: "Jurassic",
        ageFrom: 201,
        ageTo: 145,
        color: "#34b2c9",
        description: "Dinosaur dominance, first birds",
        region: "Carpathians",
      },
      {
        name: "Cretaceous",
        era: "Mesozoic",
        period: "Cretaceous",
        ageFrom: 145,
        ageTo: 66,
        color: "#7fc64e",
        description: "Flowering plants, mass extinction at end",
        region: "Carpathians",
      },
      {
        name: "Paleogene",
        era: "Cenozoic",
        period: "Paleogene",
        ageFrom: 66,
        ageTo: 23,
        color: "#fd9a52",
        description: "Mammal diversification after dinosaur extinction",
        region: "Transylvania",
      },
      {
        name: "Neogene",
        era: "Cenozoic",
        period: "Neogene",
        ageFrom: 23,
        ageTo: 2.58,
        color: "#ffff00",
        description: "Grasslands spread, hominids appear",
        region: "Transylvania",
      },
      {
        name: "Quaternary",
        era: "Cenozoic",
        period: "Quaternary",
        ageFrom: 2.58,
        ageTo: 0,
        color: "#f9f97f",
        description: "Ice ages, modern humans",
        region: "Romania",
      },
    ])
    .returning()
    .onConflictDoNothing();

  console.log(`Inserted ${stratigraphicUnits.length} stratigraphic units`);
  console.log("Seeding complete!");
}

seed().catch(console.error);
