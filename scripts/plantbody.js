// Stores physics bodies and supplies graphics
define(function () {
    function PlantBody(position /* Canonical i.e. in stage */, stage, physicsworld, physicsbinder) {
        this.physicsworld = physicsworld;
        this.physicsbinder = physicsbinder;
        this.stage = stage;

        this.growSpeed = 0;
        this.growAngle = 0;
        this.returnRate = 3;
        this.baseWidth = 25;
        this.maxWidth = 22;
        this.maxSegmentLength = 25;
        this.motorHighSpeedTarget = 10000;
        this.circleDensity = 0.5;
        this.plantAngleLimit = Math.PI/4;
        this.torqueLimit = 50;

        this.rootNode = position;

        var rootBodyDef = new Box2D.b2BodyDef();
        rootBodyDef.set_type(Box2D.b2_staticBody);
        rootBodyDef.set_position(this.physicsbinder.actorToBodyPosition(this.rootNode));
        this.rootBody = this.physicsworld.CreateBody(rootBodyDef);
        this.firstSegment = null;
        this.tip = null;
        this.swayOrig = 0;

        this.segments = [];

        //this.baseAngularSpeedText = new PIXI.Text("");
        //this.motorTorqueText = new PIXI.Text("");
        //this.motorTorqueText.y = 20;
    };

    PlantBody.prototype.getGraphics = function (framePoint1, framePoint2) {

    };

    PlantBody.prototype.update = function (delta, time) {
        // Harvest our physics seeds
        this.recurseOnSegments(this.tip.prevSegment.prevSegment, this.syncSegmentWithPhysics.bind(this));
        this.sway(this.tip.prevSegment.prevSegment, time);
        var spawnedNew = this.grow(delta, time);
        this.recurseOnSegments(this.firstSegment, (function (segment) {
            if (!this.isDynamic(segment)) this.returnToCentre(segment, delta, time);
            this.updatePhysics(segment); // Only modifies segment.physics
            this.updateGraphics(segment); // Only modifies segment.graphics

            segment.changed = false;
            segment.moved = false;
        }).bind(this));
        if (spawnedNew) this.reloadGraphics();
    };

    PlantBody.prototype.recurseOnSegments = function (segment, func) {
        func(segment);

        for (var i = 0; i < segment.branches.length; ++i) {
            this.recurseOnSegments(segment.branches[i], func);
        }
        
        if (segment.nextSegment) this.recurseOnSegments(segment.nextSegment, func);
    }

    // Return to centre
    PlantBody.prototype.returnToCentre = function (segment, delta, time) {
        if (segment.prevSegment) segment.baseNode = segment.prevSegment.topNode;
        var segAngle = this.getRelativeAngle(segment);
        var segVelocity = (segment.angle - segAngle) * this.returnRate;
        if (Math.abs(segVelocity) > 0) {
            segment.moved = true;
            if (segment.prevSegment) segment.prevSegment.moved = true;
        }
        this.setSegmentAngle(segment, this.getSegmentAngle(segment) + segVelocity * delta / 1000);
    };

    // Move outwards
    PlantBody.prototype.grow = function (delta, time) {
        var segment = this.tip;
        delta = delta/1000;

        // Get to base of growing tip
        while (segment && segment.prevSegment && segment.prevSegment.growing) {
            segment = segment.prevSegment;
        }

        var spawnedNew = false;
        while (segment) {
            var spawnThisTime = false, fullLength = false, fullWidth = false, scaling = 1;
            var lineSegment = new PIXI.Point(segment.topNode.x - segment.baseNode.x,
                                             segment.topNode.y - segment.baseNode.y);

            var newSegmentLength = segment.seglength + this.growSpeed * delta;

            if (newSegmentLength < this.maxSegmentLength) {
                scaling = newSegmentLength / segment.seglength;
            } else {
                fullLength = true;
            }

            if (segment.prevSegment) segment.baseWidth = segment.prevSegment.topWidth;

            var newTopWidth = segment.topWidth + this.growSpeed/2 * delta;
            if (segment.nextSegment && newTopWidth < this.maxWidth) {
                segment.topWidth = newTopWidth;
            } else {
                fullWidth = true;
            } 

            if (fullLength && !segment.nextSegment) {
                fullLength = false;
                scaling = 0.5;
                segment.topWidth = segment.baseWidth / 2;
                spawnThisTime = true;
            }

            var oldTop = new PIXI.Point(segment.topNode.x, segment.topNode.y);

            // Still need to do this even if no growth - others may have
            if (segment.prevSegment) segment.baseNode = segment.prevSegment.topNode;
            segment.topNode.x = segment.baseNode.x + lineSegment.x * scaling;
            segment.topNode.y = segment.baseNode.y + lineSegment.y * scaling;
            segment.seglength = Math.sqrt(Math.pow(segment.topNode.x - segment.baseNode.x,2) + 
                                          Math.pow(segment.topNode.y - segment.baseNode.y,2));

            if (spawnThisTime) {
                var newSegment = this.addSegment(segment, oldTop, segment == this.tip);
                newSegment.growing = true;
                spawnedNew = true;
                segment.prevSegment.prevSegment.angle = this.swayOrig;
                this.swayOrig = segment.prevSegment.angle;
                segment.prevSegment.prevSegment.physics = null;
            }

            if (fullLength && fullWidth && segment.prevSegment && !segment.prevSegment.growing) {
                segment.growing = false;
            }

            segment.moved = true;
            segment.changed = true;
            segment = segment.nextSegment;
        }

        return spawnedNew;
    };

    PlantBody.prototype.sway = function (segment, time) {
        var shake1 = 0, shake2 = 0;
        var shakeTime = (time/1000) % 10;
        if (shakeTime < 2) shake1 = 0.15 * Math.sin(shakeTime * Math.PI);
        var shake2Time = (time/2000) % 7;
        if (shake2Time < 3) shake2 = 0.15 * Math.sin(shake2Time * 2/3 * Math.PI);
        segment.angle = this.swayOrig + shake1 + shake2;
    }

    PlantBody.prototype.addSegment = function (prevSegment, newNode, isTip) {
        var baseNode = prevSegment ? prevSegment.topNode : this.rootNode;
        var seglength = Math.sqrt(Math.pow(newNode.x - baseNode.x, 2) + 
                                  Math.pow(newNode.y - baseNode.y, 2));
        var baseWidth = prevSegment ? prevSegment.topWidth : this.baseWidth;

        var newSegment = {
            baseNode: baseNode,
            topNode: newNode,
            prevSegment: prevSegment,
            nextSegment: null,
            branches: [],
            baseWidth: baseWidth,
            topWidth: 0,
            seglength: seglength,
            stiffness: this.computeStiffness(baseWidth, 0),
            angle: 0,
            angleVelocity: 0,
            circleDistance: 0, // Set in updatePhysics
            growing: isTip == true,
            physics: null, // Set in updatePhysics
            graphics: null, // Set in updatePhysics
            changed: true, // This is only with growing, not flexing
            moved: true
        };

        if (prevSegment) {
            prevSegment.nextSegment = newSegment;
            prevSegment.moved = true;
            prevSegment.changed = true;
        }
        else this.firstSegment = newSegment;

        if (isTip) this.tip = newSegment;

        return newSegment;
    };

    PlantBody.prototype.isDynamic = function (segment) {
        return this.tip && segment == this.tip ||
               segment == this.tip.prevSegment ||
               segment == this.tip.prevSegment.prevSegment;
    }

    PlantBody.prototype.updatePhysics = function (segment) {
        if (!segment.moved) return;
        var b = Box2D; var p = segment.physics;
        var circleRadius = this.getCircleRadius(segment.seglength);
        var dynamic = this.isDynamic(segment);
        // OKAY
        //
        // A segment owns:
        //  - Its base body
        //  - Its collision circles
        //
        // Here we:
        //  - Build and attach the body and collision circles, if
        //    it doesn't already exist
        //  - Adjust parameters (circle diameter, circle rest distance, centre distance)
        //    according to changes in length and widths
        
        // Initialise if needed
        if (p == null) {
            p = segment.physics = {};

            // Create body

            var segmentBodyDef = new b.b2BodyDef();
            segmentBodyDef.set_type(dynamic ? b.b2_dynamicBody : b.b2_kinematicBody);

            p.segmentBody = this.physicsworld.CreateBody(segmentBodyDef);

            var segmentCircle = new b.b2CircleShape();
            segmentCircle.set_m_radius(segment.seglength/4/this.physicsbinder.physicsUnitSize);
            p.segmentFixture = p.segmentBody.CreateFixture(segmentCircle, this.circleDensity*6);

            var segmentFilter = new b.b2Filter();
            segmentFilter.set_categoryBits(0x0004);
            segmentFilter.set_maskBits(0x0000);

            p.segmentFixture.SetFilterData(segmentFilter);

            // Now arrange and join circles to segment body
            
            segment.circleDistance = this.getCircleDistance(segment.baseWidth,
                                                            segment.topWidth,
                                                            circleRadius);
            
            this.attachCircles(segment);
       }

        var physicsBaseNode = this.physicsbinder.actorToBodyPosition(segment.baseNode);

        // Need to reconstruct the revolute joint if we've grown (can't bloody change the radius!)
        if (segment.changed) {
            segment.stiffness = this.computeStiffness(segment.baseWidth, segment.topWidth);

            var segmentAngleVel = p.segmentBody.GetAngularVelocity();
            var segmentLinearVel = p.segmentBody.GetLinearVelocity();

            if (p.segmentJoint) this.physicsworld.DestroyJoint(p.segmentJoint);

            p.segmentBody.DestroyFixture(p.leftCircleFixture);
            p.segmentBody.DestroyFixture(p.rightCircleFixture);

            p.segmentBody.SetTransform(new b.b2Vec2(0,0), 0);
            
            segment.circleDistance = this.getCircleDistance(segment.baseWidth,
                                                            segment.topWidth,
                                                            circleRadius);

            this.attachCircles(segment);
            
            if (dynamic) {
                var jointDef = new b.b2RevoluteJointDef();
                jointDef.Initialize(p.segmentBody,
                                    segment.prevSegment ? segment.prevSegment.physics.segmentBody
                                        : this.rootBody,
                                    physicsBaseNode);
                //jointDef.set_lowerAngle(-this.plantAngleLimit);
                //jointDef.set_upperAngle(this.plantAngleLimit);

                p.segmentJoint = this.physicsworld.CreateJoint(jointDef);

                //p.segmentBody.SetAngularVelocity(segmentAngleVel);
                //p.segmentBody.SetLinearVelocity(segmentLinearVel);
            }
        }

        this.movePhysicsToCanonicalPosition(segment);

        /*if (dynamic) {
            var jointAngle = this.getRelativeAngle(segment);
            var jointSpeed = this.getRelativeAngularSpeed(segment);

            var motorTorque = -(segment.angle - jointAngle) * segment.stiffness
                              - jointSpeed * this.plantDamping;
            motorTorque = Math.min(Math.abs(motorTorque),this.torqueLimit) * 
                (motorTorque > 0 ? 1 : -1);

            p.segmentBody.ApplyTorque(motorTorque);
        }*/
   };

    PlantBody.prototype.syncSegmentWithPhysics = function (segment) {
        if (!segment.physics) return;
        var segmentPos = segment.physics.segmentBody.GetPosition();
        segmentPos = this.physicsbinder.bodyToActorPosition(segmentPos);

        var segAngle = segment.physics.segmentBody.GetAngle();

        segment.baseNode = new PIXI.Point(segmentPos.x - segment.seglength / 2 * Math.sin(segAngle),
                                          segmentPos.y - segment.seglength / 2 * Math.cos(segAngle));
        segment.topNode = new PIXI.Point(segmentPos.x + segment.seglength / 2 * Math.sin(segAngle),
                                         segmentPos.y + segment.seglength / 2 * Math.cos(segAngle));

        segment.moved = true;
    };
    
    PlantBody.prototype.updateGraphics = function (segment) {
        if (!segment.moved) return;

        if (!segment.graphics) segment.graphics = new PIXI.Graphics;
        else segment.graphics.clear();
        var g = segment.graphics;

        g.beginFill(0x00FF00, 1);

        var baseAngle = this.getBaseAngle(segment);


        var lb = new PIXI.Point(segment.baseNode.x - segment.baseWidth / 2 * Math.cos(baseAngle),
                                segment.baseNode.y + segment.baseWidth / 2 * Math.sin(baseAngle));
        var rb = new PIXI.Point(segment.baseNode.x + segment.baseWidth / 2 * Math.cos(baseAngle),
                                segment.baseNode.y - segment.baseWidth / 2 * Math.sin(baseAngle));

        if (segment.nextSegment) {
            var topAngle = this.getBaseAngle(segment.nextSegment);

            var lt = new PIXI.Point(segment.topNode.x - segment.topWidth / 2 * Math.cos(topAngle),
                                    segment.topNode.y + segment.topWidth / 2 * Math.sin(topAngle));
            var rt = new PIXI.Point(segment.topNode.x + segment.topWidth / 2 * Math.cos(topAngle),
                                    segment.topNode.y - segment.topWidth / 2 * Math.sin(topAngle));
            
            g.moveTo(lb.x, lb.y);
            g.lineTo(lt.x, lt.y);
            g.lineTo(rt.x, rt.y);
            g.lineTo(rb.x, rb.y);
            g.lineTo(lb.x, lb.y);
        } else {
            g.moveTo(lb.x, lb.y);
            g.lineTo(segment.topNode.x, segment.topNode.y);
            g.lineTo(rb.x, rb.y);
            g.lineTo(lb.x, lb.y);
        }

        g.endFill();
        
        // Debug
        /*
        var segmentPos =
            this.physicsbinder.bodyToActorPosition(segment.physics.segmentBody.GetPosition());

        var segAngle = this.getSegmentAngle(segment);

        var leftCirclePos = new PIXI.Point(segmentPos.x - segment.circleDistance * Math.cos(segAngle),
                                           segmentPos.y + segment.circleDistance * Math.sin(segAngle));

        g.drawCircle(leftCirclePos.x, leftCirclePos.y,
                              segment.physics.leftCircleFixture.GetShape().get_m_radius() * 
                                   this.physicsbinder.physicsUnitSize);

        var rightCirclePos = new PIXI.Point(segmentPos.x + segment.circleDistance * Math.cos(segAngle),
                                            segmentPos.y - segment.circleDistance * Math.sin(segAngle));

        g.drawCircle(rightCirclePos.x, rightCirclePos.y,
                segment.physics.rightCircleFixture.GetShape().get_m_radius() * 
                this.physicsbinder.physicsUnitSize);

        g.moveTo(segmentPos.x, segmentPos.y);
        g.lineTo(leftCirclePos.x, leftCirclePos.y);
        g.moveTo(segmentPos.x, segmentPos.y);
        g.lineTo(rightCirclePos.x, rightCirclePos.y);

        g.moveTo(segment.baseNode.x, segment.baseNode.y);
        g.lineTo(segment.topNode.x, segment.topNode.y);
        */
    };

    PlantBody.prototype.reloadGraphics = function () {
        //stage.addChild(this.baseAngularSpeedText);
        //stage.addChild(this.motorTorqueText);
        this.stage.removeChildren();
        this.recurseOnSegments(this.firstSegment, (function (segment) {
            this.stage.addChild(segment.graphics);
        }).bind(this));
    };

    PlantBody.prototype.getBaseAngle = function (segment) {
        if (!segment.prevSegment) return -Math.PI;

        var prev = segment.prevSegment;

        var segAngle = Math.atan2(segment.topNode.x - segment.baseNode.x,
                segment.topNode.y - segment.baseNode.y);
        var prevAngle = Math.atan2(prev.topNode.x - prev.baseNode.x,
                prev.topNode.y - prev.baseNode.y);
        var relAngle = prevAngle - segAngle;
        relAngle -= Math.floor(relAngle/Math.PI/2)*Math.PI*2; //Now positive, no funny modulo stuff JS >:(
        relAngle = ((relAngle + Math.PI) % (Math.PI*2)) - Math.PI; // Should be in right range now

        return segAngle + relAngle / 2;
    };

    PlantBody.prototype.setSegmentAngle = function (segment, angle) {
        segment.topNode.x = segment.baseNode.x + segment.seglength * Math.sin(angle);
        segment.topNode.y = segment.baseNode.y + segment.seglength * Math.cos(angle);
    };

    PlantBody.prototype.getSegmentAngle = function (segment) {
        var segAngle = Math.atan2(segment.topNode.x - segment.baseNode.x,
                segment.topNode.y - segment.baseNode.y);

        return segAngle - Math.floor(segAngle/Math.PI/2)*Math.PI*2;
    };

    PlantBody.prototype.getRelativeAngle = function (segment) {
        var segAngle = Math.atan2(segment.topNode.x - segment.baseNode.x,
                segment.topNode.y - segment.baseNode.y);

        segAngle -= Math.floor(segAngle/Math.PI/2)*Math.PI*2;

        if (!segment.prevSegment) return segAngle - Math.PI;

        var prev = segment.prevSegment;
        var prevAngle = Math.atan2(prev.topNode.x - prev.baseNode.x,
                prev.topNode.y - prev.baseNode.y);

        prevAngle -= Math.floor(prevAngle/Math.PI/2)*Math.PI*2;

        var relAngle = segAngle - prevAngle;
        relAngle -= Math.floor(relAngle/Math.PI/2)*Math.PI*2;

        return ((relAngle + Math.PI) % (Math.PI*2)) - Math.PI;
    };

    PlantBody.prototype.getRelativeAngularSpeed = function (segment) {
        var segSpeed = segment.physics.segmentBody.GetAngularVelocity();

        if (!segment.prevSegment) return segSpeed;

        return segSpeed - segment.prevSegment.physics.segmentBody.GetAngularVelocity();
    }

    PlantBody.prototype.movePhysicsToCanonicalPosition = function (segment) {
        var b = Box2D; var p = segment.physics;

        var lineSegment = new PIXI.Point(segment.topNode.x - segment.baseNode.x,
                segment.topNode.y - segment.baseNode.y);

        var physicsLineSegment = this.physicsbinder.actorToBodyPosition(lineSegment);
        var physicsBaseNode = this.physicsbinder.actorToBodyPosition(segment.baseNode);

        var newangle = Math.atan2(physicsLineSegment.get_x(), physicsLineSegment.get_y());
        var newcentre = new b.b2Vec2(physicsBaseNode.get_x() + physicsLineSegment.get_x()/2,
                physicsBaseNode.get_y() + physicsLineSegment.get_y()/2);

        p.segmentBody.SetTransform(newcentre, newangle);
    };

    PlantBody.prototype.attachCircles = function (segment) {
        var b = Box2D; var p = segment.physics;

        // Create fixtures

        var leftCircleShape = new b.b2CircleShape();
        var rightCircleShape = new b.b2CircleShape();
        var circleRadius = this.getCircleRadius(segment.seglength);
        leftCircleShape.set_m_radius(circleRadius / this.physicsbinder.physicsUnitSize);
        rightCircleShape.set_m_radius(circleRadius / this.physicsbinder.physicsUnitSize);


        var physicsCircleDistance = segment.circleDistance / this.physicsbinder.physicsUnitSize;
        leftCircleShape.set_m_p(new b.b2Vec2(-physicsCircleDistance, 0), 0);
        rightCircleShape.set_m_p(new b.b2Vec2(physicsCircleDistance, 0), 0);

        p.leftCircleFixture = p.segmentBody.CreateFixture(leftCircleShape, this.circleDensity);
        p.rightCircleFixture = p.segmentBody.CreateFixture(rightCircleShape, this.circleDensity);

        var segmentFilter = new b.b2Filter();
        segmentFilter.set_categoryBits(0x0002);
        segmentFilter.set_maskBits(0xFFFD);

        p.leftCircleFixture.SetFilterData(segmentFilter);
        p.rightCircleFixture.SetFilterData(segmentFilter);
    };

    PlantBody.prototype.computeStiffness = function (baseWidth, topWidth) {
        return this.widthToStiffness * (baseWidth + topWidth) / 2;
    };

    PlantBody.prototype.getCircleDistance = function (baseWidth, topWidth, radius) {
        return Math.max((baseWidth + topWidth) / 4 - (0.8 * radius), 0);
    };

    PlantBody.prototype.getCircleRadius = function (seglength) {
        return seglength * 0.8 / 2;
    };

    return PlantBody;
});
