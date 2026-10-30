// Songs the editor suggests, as links: nothing is bundled. Picking one downloads that file into the
// project, like a song the user chose.
// All are Wikimedia Commons recordings (Musopen, European Archive Music) marked CC0 or public domain on
// their Commons page; links were checked to return audio on 2026-10-30. MP3 and FLAC only (the app can't decode Ogg).

export interface SuggestedSong {
    title: string;
    /** Comma-separated feel, for picking and for the AI planner. */
    mood: string;
    credit: string;
    license: string;
    /** Direct link to the audio file (upload.wikimedia.org only: see fetch_music in recording.rs). */
    url: string;
    /** The file's page, where its license can be checked. */
    page: string;
    mb: number;
}

export const SUGGESTED_MUSIC: SuggestedSong[] = [
    {
        title: "Polonaise Op.53 in A flat major, 'Heroic'",
        mood: 'triumphant, bold',
        credit: 'Frederic Chopin',
        license: 'CC0',
        url: 'https://upload.wikimedia.org/wikipedia/commons/1/13/PolonaiseOp.53InAFlatMajorheroic.mp3',
        page: 'https://commons.wikimedia.org/wiki/File:PolonaiseOp.53InAFlatMajorheroic.mp3',
        mb: 8.7,
    },
    {
        title: 'Ballade no. 1 in G minor, Op. 23',
        mood: 'dramatic, building',
        credit: 'Frederic Chopin',
        license: 'CC0',
        url: 'https://upload.wikimedia.org/wikipedia/commons/1/1b/Ballade_no._1_-_Op._23.mp3',
        page: 'https://commons.wikimedia.org/wiki/File:Ballade_no._1_-_Op._23.mp3',
        mb: 12.4,
    },
    {
        title: 'Fantaisie-Impromptu, Op. 66',
        mood: 'energetic, driving',
        credit: 'Frederic Chopin',
        license: 'CC0',
        url: 'https://upload.wikimedia.org/wikipedia/commons/2/2b/Fantaisie_Impromptu_Op._66.mp3',
        page: 'https://commons.wikimedia.org/wiki/File:Fantaisie_Impromptu_Op._66.mp3',
        mb: 6.7,
    },
    {
        title: 'Grande Valse Brillante, Op. 18',
        mood: 'upbeat, elegant',
        credit: 'Frederic Chopin',
        license: 'CC0',
        url: 'https://upload.wikimedia.org/wikipedia/commons/7/77/Grande_Valse_Brilliante_Op.18_In_E_flat_major.mp3',
        page: 'https://commons.wikimedia.org/wiki/File:Grande_Valse_Brilliante_Op.18_In_E_flat_major.mp3',
        mb: 6.9,
    },
    {
        title: 'Tarantelle, Op. 43',
        mood: 'fast, playful',
        credit: 'Frederic Chopin',
        license: 'CC0',
        url: 'https://upload.wikimedia.org/wikipedia/commons/7/7b/TarantelleOp.43.mp3',
        page: 'https://commons.wikimedia.org/wiki/File:TarantelleOp.43.mp3',
        mb: 4.7,
    },
    {
        title: 'Minute Waltz, Op. 64 no. 1',
        mood: 'light, playful',
        credit: 'Frederic Chopin',
        license: 'CC0',
        url: 'https://upload.wikimedia.org/wikipedia/commons/0/04/Waltz_Op._64_no._1_in_D_flat_major.mp3',
        page: 'https://commons.wikimedia.org/wiki/File:Waltz_Op._64_no._1_in_D_flat_major.mp3',
        mb: 2.5,
    },
    {
        title: 'Nocturne Op. 9 no. 2',
        mood: 'calm, warm',
        credit: 'Frederic Chopin',
        license: 'CC0',
        url: 'https://upload.wikimedia.org/wikipedia/commons/5/50/Nocturne_Op._9_no._2_in_E_flat_major.mp3',
        page: 'https://commons.wikimedia.org/wiki/File:Nocturne_Op._9_no._2_in_E_flat_major.mp3',
        mb: 5.4,
    },
    {
        title: 'Nocturne Op. 27 no. 1',
        mood: 'dark, cinematic',
        credit: 'Frederic Chopin',
        license: 'CC0',
        url: 'https://upload.wikimedia.org/wikipedia/commons/e/ef/Nocturne_Op._27_no._1_in_C_sharp_minor.mp3',
        page: 'https://commons.wikimedia.org/wiki/File:Nocturne_Op._27_no._1_in_C_sharp_minor.mp3',
        mb: 5.2,
    },
    {
        title: 'Nocturne Op. 48 no. 1',
        mood: 'dark, dramatic',
        credit: 'Frederic Chopin',
        license: 'CC0',
        url: 'https://upload.wikimedia.org/wikipedia/commons/3/3c/Nocturne_Op._48_no._1_in_C_minor.mp3',
        page: 'https://commons.wikimedia.org/wiki/File:Nocturne_Op._48_no._1_in_C_minor.mp3',
        mb: 6.2,
    },
    {
        title: "Prelude Op. 28 no. 15 ('Raindrop')",
        mood: 'calm, reflective',
        credit: 'Frederic Chopin',
        license: 'CC0',
        url: 'https://upload.wikimedia.org/wikipedia/commons/f/fc/Prelude_Op._28_no._15.mp3',
        page: 'https://commons.wikimedia.org/wiki/File:Prelude_Op._28_no._15.mp3',
        mb: 5.7,
    },
    {
        title: 'Mozart: Mass in C minor, Kyrie',
        mood: 'epic, choral',
        credit: 'Wolfgang Amadeus Mozart',
        license: 'CC0',
        url: 'https://upload.wikimedia.org/wikipedia/commons/0/08/Mozart_-_Mass_in_C_minor_K.427_-_I._Kyrie.mp3',
        page: 'https://commons.wikimedia.org/wiki/File:Mozart_-_Mass_in_C_minor_K.427_-_I._Kyrie.mp3',
        mb: 13.2,
    },
    {
        title: 'Palestrina: Missa Papae Marcelli, Kyrie',
        mood: 'serene, choral',
        credit: 'European Archive Music / Giovanni Pierluigi da Palestrina',
        license: 'CC0',
        url: 'https://upload.wikimedia.org/wikipedia/commons/e/e1/Missa_Papae_Marcelli_-_I._Kyrie.flac',
        page: 'https://commons.wikimedia.org/wiki/File:Missa_Papae_Marcelli_-_I._Kyrie.flac',
        mb: 10.4,
    },
    {
        title: 'Bach: Goldberg Variations, Aria',
        mood: 'calm, elegant',
        credit: 'Johann Sebastian Bach',
        license: 'Public domain',
        url: 'https://upload.wikimedia.org/wikipedia/commons/e/e6/Bach%2C_J_S_-_Goldberg_Variations%2C_BWV988_-_01._Aria_%28Shelley_Katz%29.flac',
        page: 'https://commons.wikimedia.org/wiki/File:Bach,_J_S_-_Goldberg_Variations,_BWV988_-_01._Aria_(Shelley_Katz).flac',
        mb: 13.5,
    },
];

/** The credit line shown with a suggested song. */
export const songCredit = (song: SuggestedSong) => `${song.title} · ${song.credit} · ${song.license} · Wikimedia Commons`;
