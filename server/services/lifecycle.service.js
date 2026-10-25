const ALLOWED = {
    requested: ['accepted', 'cancelled'],
    accepted: ['on_the_way', 'cancelled'],
    on_the_way: ['in_progress', 'cancelled'],
    in_progress: ['completed'],
    completed: [],
    cancelled: []
};

function canTransition(from, to) {
    if (!from || !to) return false;
    const nextStates = ALLOWED[from];
    return Array.isArray(nextStates) && nextStates.includes(to);
}

function isProviderAction(current, next) {
    if (current === 'requested' && next === 'accepted') return true;
    if (current === 'accepted' && next === 'on_the_way') return true;
    if (current === 'on_the_way' && next === 'in_progress') return true;
    if (current === 'in_progress' && next === 'completed') return true;
    return false;
}

function isCancelAction(current, next) {
    return next === 'cancelled' && ['requested', 'accepted', 'on_the_way'].includes(current);
}

module.exports = {
    ALLOWED,
    canTransition,
    isProviderAction,
    isCancelAction
};

