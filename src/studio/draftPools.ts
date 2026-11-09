const launch = (...names: string[]) => names.map((name) => `Launch${name}`);

export const POOLS = {
    title: ['TitleReveal', ...launch('CinematicTitle', 'ColdOpen', 'FocusPull', 'TeaserMask')],
    hookProblem: ['KineticStatement', ...launch('StrikeOldWay', 'ChaosCollapse', 'ProblemScrollOfDoom', 'OldVsNew', 'ErrorToCalm', 'TypedQuestion', 'PatternInterrupt')],
    hookPromise: ['KineticStatement', ...launch('TypedQuestion', 'PatternInterrupt')],
    promise: ['KineticType', ...launch('FlyingWordsTunnel', 'BeatSlam', 'PosterGrid', 'OutlineFill', 'WordFlip', 'HighlightSweep', 'Scramble')],
    reveal: launch('DeviceRise', 'SpotlightCard', 'StageScreenReveal', 'HeroFormation', 'TiltToFlat', 'PullbackToWall', 'CardFlipReveal', 'ExplodedView', 'OrbitGallery', 'WindowFan', 'MultiDeviceFamily'),
    demo: launch('UiTypingAutocomplete', 'UiTableLiveFill', 'UiTimelineAssembly', 'UiHoldToDeploy', 'CommandPalette', 'ToastCascade', 'KanbanDrag', 'FormFill', 'SelectAskAi', 'DropUpload', 'Multiplayer', 'ThemeRipple', 'PanelGridMoves', 'PhoneNotificationStack'),
    features: ['FeatureGrid', 'FeatureOrbit', ...launch('FeatureList', 'BentoTour', 'PosterGrid')],
    steps: ['HowItWorks', ...launch('DiagramsNodeFlow', 'AgentSteps', 'UiTimelineAssembly')],
    oneNumber: ['BigNumber', ...launch('Odometer', 'ShockStat', 'PenCirclesNumber', 'RingProgress')],
    numbers: ['StatCounter', ...launch('MetricsGrid', 'Odometer')],
    quote: ['Testimonial', ...launch('QuoteWall', 'SocialPostTestimonial')],
    codeOnly: ['CodeTyping', ...launch('TerminalSession', 'OneCommand', 'CodeMorphDiff')],
    ai: launch('AiAnswerStream', 'AiPrompt', 'AiOnePromptManyResults', 'AgentSteps', 'AiParallelTaskFanout', 'AiModelMenuSelect'),
    integrations: ['Integrations', ...launch('DiagramsIntegrationPickerGrid', 'DiagramsNodeFlow', 'ApiFlow')],
    interlude: launch('ShapeBlob', 'ShapeOrbit', 'ShapeRings', 'ShapeWaves', 'ShapeBalls', 'ShapeFrame', 'ShapeRipple', 'ShapeIris', 'ShapeMorph', 'ShapeBurst', 'ShapeRibbons', 'ShapeCubes'),
    closer: ['EndCard', ...launch('ButtonPress')],
    closerWithUrl: ['EndCard', ...launch('ButtonPress', 'UrlTyped', 'QrEndCard')],
};

export const TITLE_SCENES = new Set([...POOLS.title, 'LogoSting']);
export const HOOK_SCENES = new Set([...POOLS.hookProblem, ...POOLS.hookPromise]);
export const END_SCENES = new Set(POOLS.closerWithUrl);

export const seedOf = (text: string) => [...text].reduce((hash, char) => (hash * 31 + char.charCodeAt(0)) >>> 0, 7);

export const pick = (pool: string[], seed: number, salt: number) => pool[(seed + salt * 7) % pool.length];
