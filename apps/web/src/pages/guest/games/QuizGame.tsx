import { useState, useEffect, useRef } from 'react'
import { ChevronLeft, Zap, SkipForward, CheckCircle2, XCircle, Star } from 'lucide-react'
import { ACCENT, ACCENT2, SURFACE, SURFACE2, BORDER, TEXT, MUTED } from './theme'

// ─── Question Bank ────────────────────────────────────────────────────────────
type CategoryKey = 'geo' | 'science' | 'culture' | 'histoire' | 'sports' | 'general'

interface Question {
  q: string
  a: string
  o: string[]
  cat: CategoryKey
}

const QUESTIONS: Question[] = [
  // 🌍 Géographie
  { q: "Quelle est la capitale du Luxembourg ?", a: "Luxembourg-Ville", o: ["Esch-sur-Alzette", "Differdange", "Luxembourg-Ville", "Ettelbruck"], cat: 'geo' },
  { q: "Quel est le plus grand océan du monde ?", a: "Pacifique", o: ["Atlantique", "Pacifique", "Indien", "Arctique"], cat: 'geo' },
  { q: "Quelle montagne est la plus haute du monde ?", a: "Everest", o: ["K2", "Mont Blanc", "Everest", "Kilimandjaro"], cat: 'geo' },
  { q: "Dans quel pays se trouve le Taj Mahal ?", a: "Inde", o: ["Pakistan", "Bangladesh", "Inde", "Népal"], cat: 'geo' },
  { q: "Quel est le plus long fleuve du monde ?", a: "Amazone", o: ["Nil", "Amazone", "Mississippi", "Yangtsé"], cat: 'geo' },
  { q: "Combien de pays composent l'Union européenne ?", a: "27", o: ["25", "27", "29", "31"], cat: 'geo' },
  { q: "Quelle est la capitale de l'Australie ?", a: "Canberra", o: ["Sydney", "Melbourne", "Canberra", "Brisbane"], cat: 'geo' },
  { q: "Quel pays possède le plus de fuseau horaire ?", a: "France", o: ["Russie", "USA", "France", "Chine"], cat: 'geo' },
  { q: "Quel est le plus petit pays du monde ?", a: "Vatican", o: ["Monaco", "Saint-Marin", "Vatican", "Liechtenstein"], cat: 'geo' },
  { q: "Quel détroit sépare l'Europe de l'Afrique ?", a: "Gibraltar", o: ["Bosphore", "Ormuz", "Gibraltar", "Magellan"], cat: 'geo' },
  { q: "Dans quel pays se trouve le désert du Sahara ?", a: "Algérie (entre autres)", o: ["Égypte uniquement", "Algérie (entre autres)", "Soudan uniquement", "Libye uniquement"], cat: 'geo' },
  { q: "Quelle mer baigne Barcelone ?", a: "Méditerranée", o: ["Atlantique", "Méditerranée", "Adriatique", "Tyrrhénienne"], cat: 'geo' },
  { q: "Quel pays a la plus longue frontière terrestre ?", a: "Chine", o: ["Russie", "Brésil", "Chine", "USA"], cat: 'geo' },
  { q: "Quelle est la capitale du Canada ?", a: "Ottawa", o: ["Toronto", "Vancouver", "Montréal", "Ottawa"], cat: 'geo' },
  { q: "Sur quel continent se trouve le lac Victoria ?", a: "Afrique", o: ["Asie", "Amérique du Sud", "Afrique", "Océanie"], cat: 'geo' },
  { q: "Quel est le pays le plus peuplé du monde en 2024 ?", a: "Inde", o: ["Chine", "Inde", "USA", "Indonésie"], cat: 'geo' },
  { q: "Quelle ville est surnommée 'La Sérénissime' ?", a: "Venise", o: ["Florence", "Rome", "Venise", "Naples"], cat: 'geo' },
  { q: "Quel fleuve traverse Paris ?", a: "Seine", o: ["Loire", "Rhône", "Seine", "Garonne"], cat: 'geo' },
  { q: "Dans quel pays se trouve Machu Picchu ?", a: "Pérou", o: ["Bolivie", "Colombie", "Pérou", "Équateur"], cat: 'geo' },
  { q: "Quel est le nom du volcan qui a détruit Pompéi ?", a: "Vésuve", o: ["Etna", "Stromboli", "Vésuve", "Vulcano"], cat: 'geo' },

  // 🔬 Sciences
  { q: "Quelle est la vitesse de la lumière ?", a: "300 000 km/s", o: ["150 000 km/s", "300 000 km/s", "450 000 km/s", "600 000 km/s"], cat: 'science' },
  { q: "Quel élément chimique a le symbole 'Au' ?", a: "Or", o: ["Argent", "Aluminium", "Or", "Cuivre"], cat: 'science' },
  { q: "Quelle est la formule chimique de l'eau ?", a: "H₂O", o: ["CO₂", "H₂O", "O₂", "NaCl"], cat: 'science' },
  { q: "Quelle planète est la plus proche du Soleil ?", a: "Mercure", o: ["Vénus", "Terre", "Mars", "Mercure"], cat: 'science' },
  { q: "Combien de chromosomes a l'humain ?", a: "46", o: ["23", "44", "46", "48"], cat: 'science' },
  { q: "Quel gaz représente 78% de l'atmosphère ?", a: "Azote", o: ["Oxygène", "Azote", "CO₂", "Argon"], cat: 'science' },
  { q: "Quelle est la particule de charge négative ?", a: "Électron", o: ["Proton", "Neutron", "Électron", "Photon"], cat: 'science' },
  { q: "Quel organe produit l'insuline ?", a: "Pancréas", o: ["Foie", "Rein", "Pancréas", "Rate"], cat: 'science' },
  { q: "Combien d'os a le corps humain adulte ?", a: "206", o: ["198", "206", "212", "220"], cat: 'science' },
  { q: "Quel est le symbole chimique du fer ?", a: "Fe", o: ["Fr", "Fe", "Fi", "Fo"], cat: 'science' },
  { q: "Quelle est la plus petite planète du système solaire ?", a: "Mercure", o: ["Mars", "Pluton (naine)", "Mercure", "Vénus"], cat: 'science' },
  { q: "Qu'est-ce qu'une année-lumière ?", a: "Une distance", o: ["Un temps", "Une distance", "Une vitesse", "Une énergie"], cat: 'science' },
  { q: "Quel est le point d'ébullition de l'eau à pression normale ?", a: "100°C", o: ["90°C", "100°C", "110°C", "120°C"], cat: 'science' },
  { q: "Quel scientifique a formulé la loi de la gravitation ?", a: "Newton", o: ["Einstein", "Galilée", "Newton", "Kepler"], cat: 'science' },
  { q: "De quoi est composé l'ADN ?", a: "Nucléotides", o: ["Acides aminés", "Protéines", "Nucléotides", "Lipides"], cat: 'science' },
  { q: "Quel est le plus grand organe du corps humain ?", a: "Peau", o: ["Foie", "Intestin", "Peau", "Cerveau"], cat: 'science' },
  { q: "Combien de planètes dans notre système solaire ?", a: "8", o: ["7", "8", "9", "10"], cat: 'science' },
  { q: "Quelle force maintient les planètes en orbite ?", a: "Gravité", o: ["Magnétisme", "Électricité", "Gravité", "Nucléaire"], cat: 'science' },
  { q: "Quelle vitamine est synthétisée par la peau sous le soleil ?", a: "Vitamine D", o: ["Vitamine A", "Vitamine B12", "Vitamine C", "Vitamine D"], cat: 'science' },
  { q: "Quel est le pH de l'eau pure ?", a: "7", o: ["5", "6", "7", "8"], cat: 'science' },

  // 🎬 Culture Pop
  { q: "Qui a joué Iron Man dans le MCU ?", a: "Robert Downey Jr.", o: ["Chris Evans", "Robert Downey Jr.", "Chris Hemsworth", "Mark Ruffalo"], cat: 'culture' },
  { q: "Quel film a remporté l'Oscar du meilleur film en 2023 ?", a: "Everything Everywhere All at Once", o: ["The Banshees of Inisherin", "Everything Everywhere All at Once", "Tár", "Elvis"], cat: 'culture' },
  { q: "Qui a chanté 'Thriller' ?", a: "Michael Jackson", o: ["Prince", "Michael Jackson", "Madonna", "Whitney Houston"], cat: 'culture' },
  { q: "Dans quelle série vit-on à Westeros ?", a: "Game of Thrones", o: ["The Witcher", "Game of Thrones", "Vikings", "Rings of Power"], cat: 'culture' },
  { q: "Quel personnage animé habite à Bikini Bottom ?", a: "Bob l'Éponge", o: ["Nemo", "Bob l'Éponge", "Patrick", "Sandy"], cat: 'culture' },
  { q: "Qui a réalisé 'Inception' ?", a: "Christopher Nolan", o: ["Steven Spielberg", "James Cameron", "Christopher Nolan", "Denis Villeneuve"], cat: 'culture' },
  { q: "Quel groupe britannique a composé 'Bohemian Rhapsody' ?", a: "Queen", o: ["The Beatles", "Led Zeppelin", "Queen", "The Rolling Stones"], cat: 'culture' },
  { q: "Dans quel pays est né le manga ?", a: "Japon", o: ["Corée du Sud", "Chine", "Japon", "Taiwan"], cat: 'culture' },
  { q: "Quel est le vrai nom de Lady Gaga ?", a: "Stefani Germanotta", o: ["Alicia Moore", "Stefani Germanotta", "Melissa Jefferson", "Robyn Fenty"], cat: 'culture' },
  { q: "Combien de films dans la saga Star Wars (films principaux) ?", a: "9", o: ["6", "7", "9", "12"], cat: 'culture' },
  { q: "Qui a écrit Harry Potter ?", a: "J.K. Rowling", o: ["Tolkien", "George R.R. Martin", "J.K. Rowling", "Suzanne Collins"], cat: 'culture' },
  { q: "Quel est le jeu vidéo le plus vendu de tous les temps ?", a: "Minecraft", o: ["Tetris", "GTA V", "Minecraft", "Wii Sports"], cat: 'culture' },
  { q: "Quel acteur joue Jack Sparrow ?", a: "Johnny Depp", o: ["Orlando Bloom", "Keira Knightley", "Johnny Depp", "Geoffrey Rush"], cat: 'culture' },
  { q: "Qui chante 'Shape of You' ?", a: "Ed Sheeran", o: ["Justin Bieber", "Ed Sheeran", "Charlie Puth", "Sam Smith"], cat: 'culture' },
  { q: "Dans quelle ville se déroule 'Peaky Blinders' ?", a: "Birmingham", o: ["Manchester", "Liverpool", "Birmingham", "Londres"], cat: 'culture' },
  { q: "Quel studio a créé Super Mario ?", a: "Nintendo", o: ["Sega", "Sony", "Nintendo", "Capcom"], cat: 'culture' },
  { q: "Qui est le réalisateur des films 'Avatar' ?", a: "James Cameron", o: ["Peter Jackson", "Ridley Scott", "James Cameron", "George Lucas"], cat: 'culture' },
  { q: "Quel artiste a sorti l'album '25' ?", a: "Adele", o: ["Taylor Swift", "Beyoncé", "Adele", "Rihanna"], cat: 'culture' },
  { q: "Dans 'Friends', quel café les personnages fréquentent-ils ?", a: "Central Perk", o: ["The One Cup", "Central Perk", "Java City", "Café Noir"], cat: 'culture' },
  { q: "Quel film Pixar met en scène des jouets qui s'animent ?", a: "Toy Story", o: ["Cars", "Toy Story", "Up", "Coco"], cat: 'culture' },

  // 📚 Histoire
  { q: "En quelle année a débuté la Première Guerre Mondiale ?", a: "1914", o: ["1912", "1914", "1916", "1918"], cat: 'histoire' },
  { q: "Qui a peint la Joconde ?", a: "Léonard de Vinci", o: ["Michel-Ange", "Raphaël", "Léonard de Vinci", "Botticelli"], cat: 'histoire' },
  { q: "En quelle année l'homme a-t-il marché sur la Lune ?", a: "1969", o: ["1965", "1967", "1969", "1971"], cat: 'histoire' },
  { q: "Qui a écrit 'Les Misérables' ?", a: "Victor Hugo", o: ["Balzac", "Flaubert", "Victor Hugo", "Zola"], cat: 'histoire' },
  { q: "Quelle est la devise de la France ?", a: "Liberté, Égalité, Fraternité", o: ["Unité, Travail, Progrès", "Liberté, Égalité, Fraternité", "Foi, Patrie, Justice", "Dieu, Roi, Honneur"], cat: 'histoire' },
  { q: "Qui était le premier président des USA ?", a: "George Washington", o: ["Thomas Jefferson", "Abraham Lincoln", "George Washington", "John Adams"], cat: 'histoire' },
  { q: "En quelle année est tombé le mur de Berlin ?", a: "1989", o: ["1985", "1987", "1989", "1991"], cat: 'histoire' },
  { q: "Qui a dirigé l'URSS après Staline ?", a: "Khrouchtchev", o: ["Brejnev", "Gorbatchev", "Khrouchtchev", "Andropov"], cat: 'histoire' },
  { q: "Quelle civilisation a construit les pyramides de Gizeh ?", a: "Égyptiens anciens", o: ["Sumériens", "Égyptiens anciens", "Phéniciens", "Babyloniens"], cat: 'histoire' },
  { q: "En quelle année Christophe Colomb a-t-il découvert l'Amérique ?", a: "1492", o: ["1488", "1490", "1492", "1498"], cat: 'histoire' },
  { q: "Qui a fondé l'empire mongol ?", a: "Gengis Khan", o: ["Tamerlan", "Kubilai Khan", "Gengis Khan", "Attila"], cat: 'histoire' },
  { q: "Durant quelle guerre s'est produit le débarquement en Normandie ?", a: "2ème Guerre Mondiale", o: ["1ère Guerre Mondiale", "2ème Guerre Mondiale", "Guerre Froide", "Guerre de Corée"], cat: 'histoire' },
  { q: "En quelle année la Révolution Française a-t-elle commencé ?", a: "1789", o: ["1785", "1787", "1789", "1793"], cat: 'histoire' },
  { q: "Qui était Napoléon Bonaparte ?", a: "Empereur français", o: ["Roi de France", "Général républicain", "Empereur français", "Consul permanent"], cat: 'histoire' },
  { q: "Quel empire était gouverné par des 'Empereurs' à Rome ?", a: "Empire Romain", o: ["Empire Ottoman", "Empire Romain", "Empire Byzantin", "Empire Perse"], cat: 'histoire' },
  { q: "Qui a inventé l'imprimerie en Europe ?", a: "Gutenberg", o: ["Léonard de Vinci", "Gutenberg", "Archimède", "Newton"], cat: 'histoire' },
  { q: "En quelle année a eu lieu la bataille de Waterloo ?", a: "1815", o: ["1809", "1812", "1815", "1820"], cat: 'histoire' },
  { q: "Quel pharaon est associé au masque d'or célèbre ?", a: "Toutânkhamon", o: ["Ramsès II", "Cléopâtre", "Toutânkhamon", "Néfertiti"], cat: 'histoire' },
  { q: "Quelle guerre opposa les États-Unis au Vietnam du Nord ?", a: "Guerre du Vietnam", o: ["Guerre de Corée", "Guerre du Vietnam", "Guerre des Philippines", "Guerre de Sécession"], cat: 'histoire' },
  { q: "Qui était Nelson Mandela ?", a: "Président d'Afrique du Sud", o: ["Roi du Nigeria", "Premier ministre du Kenya", "Président d'Afrique du Sud", "Président du Zimbabwe"], cat: 'histoire' },

  // 🎮 Jeux & Sports
  { q: "Combien de joueurs dans une équipe de football ?", a: "11", o: ["9", "10", "11", "12"], cat: 'sports' },
  { q: "Dans quel sport joue-t-on avec un volant ?", a: "Badminton", o: ["Tennis", "Squash", "Badminton", "Ping-pong"], cat: 'sports' },
  { q: "Quel pays a organisé les JO d'été 2024 ?", a: "France", o: ["Japon", "USA", "France", "Australie"], cat: 'sports' },
  { q: "Qui détient le record de victoires en Grand Chelem (tennis) ?", a: "Novak Djokovic", o: ["Roger Federer", "Rafael Nadal", "Novak Djokovic", "Andy Murray"], cat: 'sports' },
  { q: "Dans quel sport y a-t-il un 'smash' ?", a: "Badminton / Tennis", o: ["Volleyball uniquement", "Badminton / Tennis", "Football", "Rugby"], cat: 'sports' },
  { q: "Combien de points vaut un essai au rugby ?", a: "5", o: ["3", "4", "5", "6"], cat: 'sports' },
  { q: "Quelle équipe a remporté la Coupe du Monde 2022 ?", a: "Argentine", o: ["Brésil", "France", "Argentine", "Allemagne"], cat: 'sports' },
  { q: "Combien de sets gagnants pour remporter Wimbledon (hommes) ?", a: "3", o: ["2", "3", "4", "5"], cat: 'sports' },
  { q: "Quel sport se pratique au 'Stade Roland-Garros' ?", a: "Tennis", o: ["Football", "Rugby", "Tennis", "Cyclisme"], cat: 'sports' },
  { q: "Dans quel sport parle-t-on de 'touché' ?", a: "Football américain", o: ["Rugby", "Football américain", "Basketball", "Baseball"], cat: 'sports' },
  { q: "Quelle nation domine le curling ?", a: "Canada/Suède", o: ["USA", "Russie", "Canada/Suède", "Norvège"], cat: 'sports' },
  { q: "Quel jeu vidéo met en scène un 'plombier rouge' ?", a: "Super Mario", o: ["Donkey Kong", "Super Mario", "Yoshi", "Luigi's Mansion"], cat: 'sports' },
  { q: "Combien de joueurs dans un match de basketball (par équipe) ?", a: "5", o: ["4", "5", "6", "7"], cat: 'sports' },
  { q: "Qui est le plus grand basketteur de l'histoire selon beaucoup ?", a: "Michael Jordan", o: ["LeBron James", "Kobe Bryant", "Michael Jordan", "Shaquille O'Neal"], cat: 'sports' },
  { q: "Dans quel sport dit-on 'love' pour zéro ?", a: "Tennis", o: ["Badminton", "Squash", "Tennis", "Ping-pong"], cat: 'sports' },
  { q: "Quelle est la longueur d'un marathon ?", a: "42,195 km", o: ["40 km", "42 km", "42,195 km", "45 km"], cat: 'sports' },
  { q: "Quel joueur de foot est surnommé 'La Pulga' ?", a: "Messi", o: ["Ronaldo", "Neymar", "Messi", "Mbappé"], cat: 'sports' },
  { q: "Quel sport se joue avec 5 anneaux olympiques ?", a: "Tous les sports olympiques", o: ["Natation", "Athlétisme", "Gymnistique", "Tous les sports olympiques"], cat: 'sports' },
  { q: "Dans quel pays sont nés les Jeux Olympiques anciens ?", a: "Grèce", o: ["Rome", "Egypte", "Grèce", "Perse"], cat: 'sports' },
  { q: "Quelle couleur est le maillot du leader au Tour de France ?", a: "Jaune", o: ["Rouge", "Blanc", "Jaune", "Vert"], cat: 'sports' },

  // 🧠 Culture Générale
  { q: "Combien de grammes dans un kilogramme ?", a: "1000", o: ["100", "500", "1000", "10000"], cat: 'general' },
  { q: "Quelle est la langue officielle du Brésil ?", a: "Portugais", o: ["Espagnol", "Portugais", "Français", "Brésilien"], cat: 'general' },
  { q: "Combien de côtés a un hexagone ?", a: "6", o: ["4", "5", "6", "8"], cat: 'general' },
  { q: "Quel pays a la plus grande superficie ?", a: "Russie", o: ["Canada", "Chine", "USA", "Russie"], cat: 'general' },
  { q: "Quelle est la monnaie du Japon ?", a: "Yen", o: ["Won", "Yuan", "Yen", "Baht"], cat: 'general' },
  { q: "En quelle langue dit-on 'merci' avec le mot 'Danke' ?", a: "Allemand", o: ["Néerlandais", "Suédois", "Allemand", "Danois"], cat: 'general' },
  { q: "Combien de secondes dans une heure ?", a: "3600", o: ["1800", "3600", "7200", "360"], cat: 'general' },
  { q: "Quelle planète est surnommée la 'planète rouge' ?", a: "Mars", o: ["Jupiter", "Saturne", "Mars", "Vénus"], cat: 'general' },
  { q: "Qui a inventé le téléphone ?", a: "Alexander Graham Bell", o: ["Thomas Edison", "Alexander Graham Bell", "Nikola Tesla", "Guglielmo Marconi"], cat: 'general' },
  { q: "Quelle est la couleur du ciel par temps clair ?", a: "Bleu", o: ["Bleu", "Vert", "Blanc", "Violet"], cat: 'general' },
  { q: "Combien de continents y a-t-il ?", a: "7", o: ["5", "6", "7", "8"], cat: 'general' },
  { q: "Quel est le métal le plus précieux ?", a: "Or", o: ["Argent", "Platine", "Or", "Titane"], cat: 'general' },
  { q: "Combien de lettres dans l'alphabet français ?", a: "26", o: ["24", "25", "26", "27"], cat: 'general' },
  { q: "Quelle est la boisson nationale du Japon ?", a: "Saké", o: ["Thé vert", "Sake", "Matcha", "Whisky"], cat: 'general' },
  { q: "Quel animal est le symbole de la France ?", a: "Coq Gaulois", o: ["Lion", "Aigle", "Coq Gaulois", "Fleur de Lys"], cat: 'general' },
  { q: "Combien de faces a un cube ?", a: "6", o: ["4", "5", "6", "8"], cat: 'general' },
  { q: "Qui a peint la Nuit étoilée ?", a: "Van Gogh", o: ["Monet", "Picasso", "Van Gogh", "Dalí"], cat: 'general' },
  { q: "Quelle est la capitale de l'Espagne ?", a: "Madrid", o: ["Barcelone", "Séville", "Madrid", "Valence"], cat: 'general' },
  { q: "Combien font 12 × 12 ?", a: "144", o: ["132", "144", "156", "148"], cat: 'general' },
  { q: "Quel arbre produit des glands ?", a: "Chêne", o: ["Châtaignier", "Hêtre", "Chêne", "Tilleul"], cat: 'general' },
]

const CATEGORY_META: Record<CategoryKey, { label: string; icon: string; color: string }> = {
  geo:      { label: 'Géographie',     icon: '🌍', color: '#06b6d4' },
  science:  { label: 'Sciences',       icon: '🔬', color: '#22c55e' },
  culture:  { label: 'Culture Pop',    icon: '🎬', color: '#f59e0b' },
  histoire: { label: 'Histoire',       icon: '📚', color: '#ef4444' },
  sports:   { label: 'Jeux & Sports',  icon: '🎮', color: '#a855f7' },
  general:  { label: 'Culture Générale',icon: '🧠', color: '#ec4899' },
}

const QUESTION_TIME = 15
const QUESTIONS_PER_GAME = 10

function shuffle<T>(arr: T[]): T[] { return [...arr].sort(() => Math.random() - 0.5) }
function getLS<T>(key: string, fallback: T): T {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback }
  catch { return fallback }
}
function setLS(key: string, val: unknown) {
  try { localStorage.setItem(key, JSON.stringify(val)) } catch {}
}

type Screen = 'menu' | 'game' | 'end'
type Lifeline = '50-50' | 'skip'

export default function QuizGame({ onBack }: { onBack?: () => void }) {
  const [screen, setScreen] = useState<Screen>('menu')
  const [selectedCat, setSelectedCat] = useState<CategoryKey | 'mix'>('mix')
  const [questions, setQuestions] = useState<Question[]>([])
  const [shuffledOptions, setShuffledOptions] = useState<string[][]>([])
  const [idx, setIdx] = useState(0)
  const [score, setScore] = useState(0)
  const [streak, setStreak] = useState(0)
  const [bestStreak, setBestStreak] = useState(0)
  const [lives, setLives] = useState(3)
  const [chosen, setChosen] = useState<string | null>(null)
  const [eliminated, setEliminated] = useState<string[]>([])
  const [timeLeft, setTimeLeft] = useState(QUESTION_TIME)
  const [usedLifelines, setUsedLifelines] = useState<Set<Lifeline>>(new Set())
  const [catScores, setCatScores] = useState<Partial<Record<CategoryKey, { correct: number; total: number }>>>({})
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | 'timeout' | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const leaderboard = getLS<Record<string, number>>('quiz_leaderboard', {})

  const current = questions[idx]

  // ── Timer ──
  useEffect(() => {
    if (screen !== 'game' || chosen !== null || feedback) return
    setTimeLeft(QUESTION_TIME)
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          handleTimeout()
          return 0
        }
        return t - 1
      })
    }, 1000)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [screen, idx])

  const stopTimer = () => { if (timerRef.current) clearInterval(timerRef.current) }

  const handleTimeout = () => {
    stopTimer()
    setFeedback('timeout')
    const newLives = lives - 1
    setLives(newLives)
    setStreak(0)
    setTimeout(() => advanceQuestion(newLives), 1200)
  }

  const advanceQuestion = (currentLives: number) => {
    const next = idx + 1
    if (next >= questions.length || currentLives <= 0) {
      endGame()
    } else {
      setIdx(next)
      setChosen(null)
      setEliminated([])
      setFeedback(null)
    }
  }

  const startGame = () => {
    const pool = selectedCat === 'mix'
      ? (Object.keys(CATEGORY_META) as CategoryKey[]).flatMap(cat =>
          shuffle(QUESTIONS.filter(q => q.cat === cat)).slice(0, Math.ceil(QUESTIONS_PER_GAME / 6))
        )
      : shuffle(QUESTIONS.filter(q => q.cat === selectedCat))
    const selected = shuffle(pool).slice(0, QUESTIONS_PER_GAME)
    setQuestions(selected)
    setShuffledOptions(selected.map(q => shuffle(q.o)))
    setIdx(0)
    setScore(0)
    setStreak(0)
    setBestStreak(0)
    setLives(3)
    setChosen(null)
    setEliminated([])
    setFeedback(null)
    setUsedLifelines(new Set())
    setCatScores({})
    setScreen('game')
  }

  const pick = (ans: string) => {
    if (chosen || feedback || !current) return
    stopTimer()
    setChosen(ans)
    const isCorrect = ans === current.a
    if (isCorrect) {
      const speedBonus = Math.round((timeLeft / QUESTION_TIME) * 50)
      const streakMulti = streak >= 3 ? 2 : streak >= 1 ? 1.5 : 1
      const pts = Math.round((100 + speedBonus) * streakMulti)
      setScore(s => s + pts)
      const ns = streak + 1
      setStreak(ns)
      setBestStreak(b => Math.max(b, ns))
      setCatScores(prev => {
        const c = prev[current.cat] ?? { correct: 0, total: 0 }
        return { ...prev, [current.cat]: { correct: c.correct + 1, total: c.total + 1 } }
      })
      setFeedback('correct')
      setTimeout(() => advanceQuestion(lives), 1000)
    } else {
      const nl = lives - 1
      setLives(nl)
      setStreak(0)
      setCatScores(prev => {
        const c = prev[current.cat] ?? { correct: 0, total: 0 }
        return { ...prev, [current.cat]: { correct: c.correct, total: c.total + 1 } }
      })
      setFeedback('wrong')
      setTimeout(() => advanceQuestion(nl), 1200)
    }
  }

  const use5050 = () => {
    if (usedLifelines.has('50-50') || chosen || !current) return
    const wrong = shuffledOptions[idx].filter(o => o !== current.a)
    const toElim = shuffle(wrong).slice(0, 2)
    setEliminated(toElim)
    setUsedLifelines(prev => new Set([...prev, '50-50']))
  }

  const useSkip = () => {
    if (usedLifelines.has('skip') || chosen || !current) return
    stopTimer()
    setUsedLifelines(prev => new Set([...prev, 'skip']))
    advanceQuestion(lives)
  }

  const endGame = () => {
    stopTimer()
    // Save leaderboard
    const catKey = selectedCat === 'mix' ? 'mix' : selectedCat
    const prev = leaderboard[catKey] ?? 0
    if (score > prev) {
      const newLB = { ...leaderboard, [catKey]: score }
      setLS('quiz_leaderboard', newLB)
    }
    setScreen('end')
  }

  const timerPct = (timeLeft / QUESTION_TIME) * 100
  const timerColor = timeLeft > 8 ? '#22c55e' : timeLeft > 4 ? '#f59e0b' : '#ef4444'

  // ── MENU ──
  if (screen === 'menu') return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <button onClick={onBack} className="p-1.5 rounded-lg hover:opacity-70" style={{ color: MUTED }}>
          <ChevronLeft size={18} />
        </button>
        <span className="font-black text-lg" style={{ color: TEXT }}>❓ Quiz Français</span>
      </div>

      {/* Category cards */}
      <div>
        <p className="text-xs font-semibold mb-2" style={{ color: MUTED }}>Choisissez une catégorie</p>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => setSelectedCat('mix')}
            className="rounded-2xl p-3 text-left transition-all"
            style={{
              background: selectedCat === 'mix' ? `linear-gradient(135deg, ${ACCENT}, ${ACCENT2})` : SURFACE2,
              border: `1px solid ${selectedCat === 'mix' ? 'transparent' : BORDER}`,
              gridColumn: 'span 2',
            }}
          >
            <span className="text-xl">🎲</span>
            <p className="font-black text-sm mt-1" style={{ color: selectedCat === 'mix' ? '#fff' : TEXT }}>Mix Toutes Catégories</p>
            <p className="text-[10px]" style={{ color: selectedCat === 'mix' ? 'rgba(255,255,255,0.7)' : MUTED }}>
              {QUESTIONS_PER_GAME} questions variées
            </p>
          </button>
          {(Object.entries(CATEGORY_META) as [CategoryKey, typeof CATEGORY_META[CategoryKey]][]).map(([key, meta]) => {
            const best = leaderboard[key]
            return (
              <button
                key={key}
                onClick={() => setSelectedCat(key)}
                className="rounded-2xl p-3 text-left transition-all"
                style={{
                  background: selectedCat === key ? `${meta.color}22` : SURFACE2,
                  border: `1px solid ${selectedCat === key ? meta.color : BORDER}`,
                }}
              >
                <span className="text-xl">{meta.icon}</span>
                <p className="font-bold text-xs mt-1" style={{ color: TEXT }}>{meta.label}</p>
                {best !== undefined && (
                  <p className="text-[10px]" style={{ color: meta.color }}>🏆 {best} pts</p>
                )}
              </button>
            )
          })}
        </div>
      </div>

      <button
        onClick={startGame}
        className="w-full py-3.5 rounded-2xl font-black text-base"
        style={{ background: `linear-gradient(135deg, ${ACCENT}, ${ACCENT2})`, color: '#fff' }}
      >
        Commencer 🚀
      </button>

      <p className="text-center text-[10px]" style={{ color: MUTED }}>
        {QUESTIONS_PER_GAME} questions · 3 vies · 15s par question
      </p>
    </div>
  )

  // ── END ──
  if (screen === 'end') {
    const pct = Math.round((score / (QUESTIONS_PER_GAME * 150)) * 100)
    const medal = pct >= 80 ? '🏆' : pct >= 55 ? '🥈' : pct >= 35 ? '🥉' : '📚'
    const msg = pct >= 80 ? 'Excellent !' : pct >= 55 ? 'Bien joué !' : pct >= 35 ? 'Pas mal !' : 'Continuez !'
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <button onClick={onBack} className="p-1.5 rounded-lg hover:opacity-70" style={{ color: MUTED }}>
            <ChevronLeft size={18} />
          </button>
          <span className="font-black text-lg" style={{ color: TEXT }}>❓ Quiz Français</span>
        </div>

        <div className="rounded-2xl p-6 text-center space-y-3" style={{ background: SURFACE, border: `1px solid ${BORDER}` }}>
          <div className="text-5xl">{medal}</div>
          <p className="font-black text-4xl" style={{ background: `linear-gradient(135deg, ${ACCENT}, ${ACCENT2})`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            {score}
          </p>
          <p className="font-bold" style={{ color: TEXT }}>{msg}</p>
          <p className="text-xs" style={{ color: MUTED }}>Meilleure série : {bestStreak} 🔥</p>

          {/* Category breakdown */}
          {Object.keys(catScores).length > 0 && (
            <div className="pt-2 space-y-1.5">
              {(Object.entries(catScores) as [CategoryKey, { correct: number; total: number }][]).map(([cat, cs]) => {
                const meta = CATEGORY_META[cat]
                const catPct = Math.round((cs.correct / cs.total) * 100)
                return (
                  <div key={cat} className="flex items-center gap-2">
                    <span className="text-sm">{meta.icon}</span>
                    <div className="flex-1 rounded-full h-1.5 overflow-hidden" style={{ background: SURFACE2 }}>
                      <div className="h-full rounded-full" style={{ width: `${catPct}%`, background: meta.color }} />
                    </div>
                    <span className="text-[10px] w-12 text-right" style={{ color: MUTED }}>{cs.correct}/{cs.total}</span>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button onClick={() => setScreen('menu')} className="py-3 rounded-2xl font-bold text-sm"
            style={{ background: SURFACE2, border: `1px solid ${BORDER}`, color: TEXT }}>
            ← Menu
          </button>
          <button onClick={startGame} className="py-3 rounded-2xl font-black text-sm"
            style={{ background: `linear-gradient(135deg, ${ACCENT}, ${ACCENT2})`, color: '#fff' }}>
            Rejouer 🔄
          </button>
        </div>
      </div>
    )
  }

  // ── GAME ──
  if (!current) return null

  const meta = CATEGORY_META[current.cat]
  const opts = shuffledOptions[idx] ?? []

  return (
    <div className="space-y-3">
      <style>{`
        @keyframes correctScale { 0%{transform:scale(1)} 50%{transform:scale(1.03)} 100%{transform:scale(1)} }
        @keyframes wrongShake { 0%,100%{transform:translateX(0)} 20%,60%{transform:translateX(-5px)} 40%,80%{transform:translateX(5px)} }
        @keyframes fadeSlideIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
      `}</style>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => { stopTimer(); setScreen('menu') }}
            className="p-1.5 rounded-lg hover:opacity-70" style={{ color: MUTED }}>
            <ChevronLeft size={18} />
          </button>
          <span className="text-sm font-bold" style={{ color: meta.color }}>
            {meta.icon} {meta.label}
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span style={{ color: '#ef4444' }}>{'❤️'.repeat(lives)}{'🖤'.repeat(3 - lives)}</span>
          <span className="font-black" style={{ color: ACCENT }}>{score}</span>
        </div>
      </div>

      {/* Progress */}
      <div className="space-y-1">
        <div className="flex justify-between text-[10px]" style={{ color: MUTED }}>
          <span>Question {idx + 1} / {questions.length}</span>
          {streak >= 2 && <span style={{ color: '#f59e0b' }}>{streak}× 🔥 {streak >= 3 ? 'BONUS ×2 !' : 'BONUS ×1.5 !'}</span>}
        </div>
        <div className="rounded-full h-1.5 overflow-hidden" style={{ background: SURFACE2 }}>
          <div className="h-full rounded-full transition-all"
            style={{ width: `${((idx) / questions.length) * 100}%`, background: meta.color }} />
        </div>
      </div>

      {/* Timer bar */}
      <div className="flex items-center gap-2">
        <div className="flex-1 rounded-full h-2.5 overflow-hidden" style={{ background: SURFACE2 }}>
          <div className="h-full rounded-full transition-all duration-1000"
            style={{ width: `${timerPct}%`, background: timerColor }} />
        </div>
        <span className="text-xs font-black w-6 text-right" style={{ color: timerColor }}>{timeLeft}</span>
      </div>

      {/* Question */}
      <div
        className="rounded-2xl p-4"
        style={{
          background: SURFACE,
          border: `1px solid ${BORDER}`,
          animation: 'fadeSlideIn 0.3s ease',
        }}
      >
        <p className="font-bold text-sm leading-relaxed" style={{ color: TEXT }}>{current.q}</p>
      </div>

      {/* Options */}
      <div className="space-y-2" style={{ animation: 'fadeSlideIn 0.3s ease' }}>
        {opts.map((opt, i) => {
          const isElim = eliminated.includes(opt)
          const isChosen = chosen === opt
          const isCorrect = opt === current.a
          const showResult = chosen !== null || feedback === 'timeout'
          let bg = SURFACE2
          let borderC = BORDER
          let color = TEXT
          let animStyle: React.CSSProperties = {}
          if (isElim) { color = MUTED; bg = 'transparent'; borderC = 'transparent' }
          else if (showResult) {
            if (isCorrect) { bg = 'rgba(34,197,94,0.15)'; borderC = 'rgba(34,197,94,0.5)'; color = '#22c55e'; animStyle = { animation: 'correctScale 0.3s ease' } }
            else if (isChosen && !isCorrect) { bg = 'rgba(239,68,68,0.1)'; borderC = 'rgba(239,68,68,0.4)'; color = '#ef4444'; animStyle = { animation: 'wrongShake 0.3s ease' } }
            else { color = MUTED }
          }
          const letters = ['A', 'B', 'C', 'D']
          return (
            <button
              key={opt}
              onClick={() => !isElim && pick(opt)}
              disabled={!!chosen || !!feedback || isElim}
              className="w-full rounded-xl px-3 py-2.5 text-left text-sm font-medium flex items-center gap-3 transition-all"
              style={{ background: bg, border: `1px solid ${borderC}`, color, ...animStyle, opacity: isElim ? 0.3 : 1 }}
            >
              <span className="rounded-lg w-6 h-6 flex items-center justify-center text-xs font-black shrink-0"
                style={{ background: isCorrect && showResult ? '#22c55e' : SURFACE, color: isCorrect && showResult ? '#fff' : MUTED }}>
                {letters[i]}
              </span>
              <span className="flex-1">{opt}</span>
              {showResult && isCorrect && <CheckCircle2 size={16} style={{ color: '#22c55e' }} />}
              {showResult && isChosen && !isCorrect && <XCircle size={16} style={{ color: '#ef4444' }} />}
            </button>
          )
        })}
      </div>

      {/* Lifelines */}
      <div className="flex gap-2">
        <button
          onClick={use5050}
          disabled={usedLifelines.has('50-50') || !!chosen}
          className="flex-1 rounded-xl py-2 flex items-center justify-center gap-1.5 text-xs font-bold transition-all"
          style={{
            background: usedLifelines.has('50-50') ? SURFACE2 : 'rgba(245,158,11,0.1)',
            border: `1px solid ${usedLifelines.has('50-50') ? BORDER : 'rgba(245,158,11,0.4)'}`,
            color: usedLifelines.has('50-50') ? MUTED : '#f59e0b',
            opacity: usedLifelines.has('50-50') ? 0.5 : 1,
          }}
        >
          <Zap size={13} /> 50/50
        </button>
        <button
          onClick={useSkip}
          disabled={usedLifelines.has('skip') || !!chosen}
          className="flex-1 rounded-xl py-2 flex items-center justify-center gap-1.5 text-xs font-bold transition-all"
          style={{
            background: usedLifelines.has('skip') ? SURFACE2 : 'rgba(6,182,212,0.1)',
            border: `1px solid ${usedLifelines.has('skip') ? BORDER : 'rgba(6,182,212,0.4)'}`,
            color: usedLifelines.has('skip') ? MUTED : ACCENT2,
            opacity: usedLifelines.has('skip') ? 0.5 : 1,
          }}
        >
          <SkipForward size={13} /> Passer
        </button>
        <div className="flex-1 rounded-xl py-2 flex items-center justify-center gap-1.5 text-xs font-bold"
          style={{ background: SURFACE2, border: `1px solid ${BORDER}`, color: streak >= 2 ? '#f59e0b' : MUTED }}>
          <Star size={13} /> ×{streak >= 3 ? '2' : streak >= 1 ? '1.5' : '1'}
        </div>
      </div>
    </div>
  )
}
