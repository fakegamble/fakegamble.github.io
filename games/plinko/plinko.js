document.addEventListener('DOMContentLoaded', () => {
    const { Engine, Render, Runner, Bodies, Composite, Events } = Matter;

    // Adjust physics engine properties for slower ball movement
    const engine = Engine.create({
        gravity: { y: 0.5 }, // Reduced gravity (default is 1)
    });
    const world = engine.world;

    const render = Render.create({
        element: document.getElementById('plinko-board'),
        engine: engine,
        options: {
            width: 800,
            height: 600,
            wireframes: false,
            background: 'transparent'
        }
    });

    Render.run(render);
    const runner = Runner.create();
    Runner.run(runner, engine);

    // Adjust wall positions and sizes to create a proper containment
    const ground = Bodies.rectangle(400, 590, 810, 60, { 
        isStatic: true,
        render: { visible: false }
    });
    const leftWall = Bodies.rectangle(-20, 300, 60, 600, {  // Moved left wall further left
        isStatic: true,
        render: { visible: false }
    });
    const rightWall = Bodies.rectangle(820, 300, 60, 600, {  // Moved right wall further right
        isStatic: true,
        render: { visible: false }
    });
    Composite.add(world, [ground, leftWall, rightWall]);

    // Create pegs with increasing number per row
    const pegRadius = 5;
    const pegRows = 10;
    const pegSpacingY = 50;
    const pegSpacingX = 50;
    const offsetX = 0;
    const offsetY = 50;

    for (let row = 0; row < pegRows; row++) {
        const pegsInRow = 3 + row;
        const rowWidth = (pegsInRow - 1) * pegSpacingX;
        const startX = (800 - rowWidth) / 2;

        for (let col = 0; col < pegsInRow; col++) {
            const x = startX + col * pegSpacingX;
            const y = offsetY + row * pegSpacingY;
            const peg = Bodies.circle(x, y, pegRadius, { 
                isStatic: true,
                render: { fillStyle: '#ffffff' }
            });
            Composite.add(world, peg);
        }
    }

    // Add invisible walls to prevent balls from escaping
    const topWall = Bodies.rectangle(400, 0, 800, 20, { 
        isStatic: true,
        render: { visible: false }
    });
    const bottomWall = Bodies.rectangle(400, 600, 800, 20, { 
        isStatic: true,
        render: { visible: false }
    });
    Composite.add(world, [topWall, bottomWall]);

    // Add angled barriers at the bottom to guide balls into slots
    const barrierOptions = {
        isStatic: true,
        render: { visible: false }
    };

    // Add left and right angled barriers
    const leftBarrier = Bodies.rectangle(100, 500, 200, 20, {
        ...barrierOptions,
        angle: Math.PI * 0.25  // 45 degrees
    });
    const rightBarrier = Bodies.rectangle(700, 500, 200, 20, {
        ...barrierOptions,
        angle: -Math.PI * 0.25  // -45 degrees
    });

    // Add them to the world
    Composite.add(world, [leftBarrier, rightBarrier]);

    // Add multiplier values array
    const multipliers = [76, 10, 3, 0.9, 0.3, 0.2, 0.3, 0.9, 3, 10, 76];

    // Modify the drop ball event listener
    document.getElementById('actionButton').addEventListener('click', () => {
        const betAmount = parseFloat(document.getElementById('betAmount').value);
        
        // Validate bet amount
        if (isNaN(betAmount) || betAmount <= 0 || betAmount > window.playerBalance) {
            alert('Invalid bet amount');
            return;
        }

        // Deduct bet amount immediately
        window.updateBalance(window.playerBalance - betAmount);
        
        const initialX = 400 + (Math.random() - 0.5) * 60; // Reduced random range
        const ball = Bodies.circle(initialX, 50, 10, {  // Start slightly lower
            restitution: 0.5,
            friction: 0.002, // Reduced friction
            density: 0.002,  // Reduced density
            betAmount: betAmount, // Store bet amount with the ball
            collisionFilter: {  // Add collision filtering
                group: 1,
                category: 0x0002,
                mask: 0x0001
            }
        });
        Composite.add(world, ball);
    });

    // Modify collision handling to check for wins
    Events.on(engine, 'collisionStart', (event) => {
        event.pairs.forEach(pair => {
            if (pair.bodyA === ground || pair.bodyB === ground) {
                const ball = pair.bodyA === ground ? pair.bodyB : pair.bodyA;
                
                // Calculate which multiplier slot the ball landed in
                const ballX = ball.position.x;
                const slotWidth = 800 / (multipliers.length + 1);
                const slotIndex = Math.floor(ballX / slotWidth);
                const multiplier = multipliers[Math.min(Math.max(0, slotIndex - 1), multipliers.length - 1)];
                
                // Calculate winnings
                const winAmount = ball.betAmount * multiplier;
                
                // Update balance and show result
                window.updateBalance(window.playerBalance + winAmount);
                
                // Show result overlay
                const resultOverlay = document.querySelector('.result-overlay');
                const resultText = resultOverlay.querySelector('.result-text');
                const resultAmount = resultOverlay.querySelector('.result-amount');
                
                resultText.textContent = multiplier >= 1 ? 'WIN!' : 'LOSS';
                resultAmount.textContent = `$${winAmount.toFixed(2)}`;
                resultOverlay.style.display = 'flex';
                
                // Hide overlay after 2 seconds
                setTimeout(() => {
                    resultOverlay.style.display = 'none';
                }, 2000);
                
                // Remove the ball
                Composite.remove(world, ball);
            }
        });
    });
});