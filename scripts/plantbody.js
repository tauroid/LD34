// Stores physics bodies and supplies graphics
define(function () {
    function PlantBody(position /* Canonical i.e. in stage */, physicsworld, physicsbinder) {
        this.physicsworld = physicsworld;
        this.physicsbinder = physicsbinder;

        this.widthToStiffness = 4;
        this.baseWidth = 20;
        this.maxWidth = 18
        this.maxSegmentLength = 30;
        this.motorHighSpeedTarget = 10000;
        this.circleDensity = 0.5;
        this.plantAngleLimit = Math.PI/4;
        this.plantDamping = 4;
        this.plantWallStiffness = 10;
        this.plantWallDamping = 0.3;
        this.torqueLimit = 10;

        this.rootNode = position;

        var rootBodyDef = new Box2D.b2BodyDef();
        rootBodyDef.set_position(this.physicsbinder.actorToBodyPosition(this.rootNode));
        this.rootBody = this.physicsworld.CreateBody(rootBodyDef);
        this.firstSegment = null;
        this.tip = null;

        this.segments = [];

        //this.baseAngularSpeedText = new PIXI.Text("");
        //this.motorTorqueText = new PIXI.Text("");
        //this.motorTorqueText.y = 20;
    };

    PlantBody.prototype.getGraphics = function (framePoint1, framePoint2) {

    };

    PlantBody.prototype.update = function (delta, time) {
        this.recurseOnSegments(this.firstSegment, (function (segment) {
            segment.moved = this.hasMoved(segment);

            this.updatePhysics(segment);
            this.updateGraphics(segment);

            segment.changed = false;
            segment.moved = false;
        }).bind(this));
    };

    PlantBody.prototype.recurseOnSegments = function (segment, func) {
        func(segment);

        for (var i = 0; i < segment.branches.length; ++i) {
            this.recurseOnSegments(segment.branches[i], func);
        }
        
        if (segment.nextSegment) this.recurseOnSegments(segment.nextSegment, func);
    }

    PlantBody.prototype.grow = function (speed, delta, time) {
        var segment = this.tip;

        // Get to base of growing tip
        while (segment && segment.prevSegment && segment.prevSegment.growing) {
            segment = segment.prevSegment;
        }

        var fullLength = false, fullWidth = false, scaling = 1;
        while (segment.nextSegment) {
            var lineSegment = new PIXI.Point(segment.topNode.x - segment.baseNode.x,
                                             segment.topNode.y - segment.baseNode.y);

            var newSegmentLength = segment.seglength + speed * delta;

            if (newSegmentLength < this.maxSegmentLength) {
                scaling = newSegmentLength / segment.seglength;
            } else {
                fullLength = true;
            }

            // Still need to do this even if no growth - others may have
            segment.baseNode = segment.prevSegment.topNode;
            segment.topNode.x = segment.baseNode.x + lineSegment.x * scaling;
            segment.topNode.y = segment.baseNode.y + lineSegment.y * scaling;
            segment.seglength = Math.sqrt(Math.pow(segment.topNode.x - segment.baseNode.x,2) + 
                                          Math.pow(segment.topNode.y - segment.baseNode.y,2));
        }                                
    };

    PlantBody.prototype.hasMoved = function (segment) {
        return segment.physics.segmentBody.IsAwake() ||
               segment.physics.leftCircleBody.IsAwake() ||
               segment.physics.rightCircleBody.IsAwake();
    };

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
            circleDistance: 0, // Set in updatePhysics
            growing: isTip == true,
            physics: null, // Set in updatePhysics
            graphics: null, // Set in updatePhysics
            changed: true, // This is only with growing, not flexing
            moved: true
        };

        this.updatePhysics(newSegment);
        this.updateGraphics(newSegment);

        newSegment.changed = false;
        newSegment.moved = false;

        if (prevSegment) {
            prevSegment.nextSegment = newSegment;
            prevSegment.moved = true;
        }
        else this.firstSegment = newSegment;

        if (isTip) this.tip = newSegment;

        return newSegment;
    };

    PlantBody.prototype.updatePhysics = function (segment) {
        if (!segment.moved) return;
        var b = Box2D; var p = segment.physics;
        // OKAY
        //
        // A segment owns:
        //  - Its base joint
        //  - Its collision circles
        //  - Its collision circle joints
        //
        // Here we:
        //  - Build a mechanism and attach it to the previous segment, if
        //    it doesn't already exist
        //  - Adjust parameters (circle diameter, circle rest distance, centre distance)
        //    according to changes in length and widths
        //  - Set motor torques and forces according to positions and stiffnesses
        //  - Update segment data from physical data
        
        // Initialise if needed
        if (p == null) {
            p = segment.physics = {};

            // Create body

            var segmentBodyDef = new b.b2BodyDef();
            segmentBodyDef.set_type(b.b2_dynamicBody);

            p.segmentBody = this.physicsworld.CreateBody(segmentBodyDef);

            var segmentCircle = new b.b2CircleShape();
            segmentCircle.set_m_radius(segment.seglength/4/this.physicsbinder.physicsUnitSize);
            p.segmentFixture = p.segmentBody.CreateFixture(segmentCircle, this.circleDensity*6);

            var segmentFilter = new b.b2Filter();
            segmentFilter.set_categoryBits(0x0004);
            segmentFilter.set_maskBits(0x0000);

            p.segmentFixture.SetFilterData(segmentFilter);

            // Now arrange and join circles to segment body
            
            this.attachCircles(segment);
            this.moveSegmentToInitialPosition(segment);
            this.moveCirclesToInitialPosition(segment);
       }

        // Need to reconstruct the revolute joint if we've grown (can't bloody change the radius!)
        if (segment.changed) {
            segment.stiffness = this.computeStiffness(segment.baseWidth, segment.topWidth);

            if (p.segmentJoint) this.physicsworld.DestroyJoint(p.segmentJoint);

            var lineSegment = new PIXI.Point(segment.topNode.x - segment.baseNode.x,
                                             segment.topNode.y - segment.baseNode.y);

            var physicsLineSegment = this.physicsbinder.actorToBodyPosition(lineSegment);
            var physicsBaseNode = this.physicsbinder.actorToBodyPosition(segment.baseNode);

            var newangle = Math.atan2(physicsLineSegment.get_x(), physicsLineSegment.get_y());
            var newcentre = new b.b2Vec2(physicsBaseNode.get_x() + physicsLineSegment.get_x()/2,
                                         physicsBaseNode.get_y() + physicsLineSegment.get_y()/2);
            
            p.segmentBody.SetTransform(newcentre, newangle);

            this.moveCirclesToPosition(segment, newcentre, newangle);

            var segmentJointDef = new b.b2RevoluteJointDef();
            segmentJointDef.Initialize(p.segmentBody,
                                       segment.prevSegment ?
                                           segment.prevSegment.physics.segmentBody : this.rootBody,
                                       physicsBaseNode);
            console.log(physicsBaseNode.get_x()+" "+physicsBaseNode.get_y());
            segmentJointDef.set_enableLimit(true);
            segmentJointDef.set_lowerAngle(-this.plantAngleLimit);
            segmentJointDef.set_upperAngle(this.plantAngleLimit);

            p.segmentJoint = this.physicsworld.CreateJoint(segmentJointDef);
            
            var circleRadius = this.getCircleRadius(segment.seglength);
            segment.circleDistance = this.getCircleDistance(segment.baseWidth,
                                                            segment.topWidth,
                                                            circleRadius);

            p.leftCircleFixture.GetShape().set_m_radius(circleRadius/this.physicsbinder.physicsUnitSize);
            p.rightCircleFixture.GetShape().set_m_radius(circleRadius/this.physicsbinder.physicsUnitSize);
        }

        // Now do forces, finally
        
        // Segment joint
        var jointAngle = this.getRelativeAngle(segment);
        var jointSpeed = this.getRelativeAngularSpeed(segment);


        var motorTorque = -(segment.angle - jointAngle) * segment.stiffness
                          - jointSpeed * this.plantDamping;
        motorTorque = Math.min(Math.abs(motorTorque),this.torqueLimit) * 
            (motorTorque > 0 ? 1 : -1);
        
        //if (segment.prevSegment == null) 
        //    this.baseAngularSpeedText.text = jointSpeed.toString();
        //    this.motorTorqueText.text = motorTorque.toString();
        //

        p.segmentBody.ApplyTorque(motorTorque);

        // Circle joints
        
        this.applyCircleForces(segment);

        // Sync
        
        this.syncSegmentWithPhysics(segment);
   };

    PlantBody.prototype.syncSegmentWithPhysics = function (segment) {
        var segmentPos = segment.physics.segmentBody.GetPosition();
        segmentPos = this.physicsbinder.bodyToActorPosition(segmentPos);

        var segAngle = segment.physics.segmentBody.GetAngle();

        segment.baseNode = new PIXI.Point(segmentPos.x + segment.seglength / 2 * Math.sin(segAngle),
                                          segmentPos.y - segment.seglength / 2 * Math.cos(segAngle));
        segment.topNode = new PIXI.Point(segmentPos.x - segment.seglength / 2 * Math.sin(segAngle),
                                         segmentPos.y + segment.seglength / 2 * Math.cos(segAngle));
    };
    
    PlantBody.prototype.updateGraphics = function (segment) {
        if (!segment.moved) return;

        if (!segment.graphics) segment.graphics = new PIXI.Graphics;
        else segment.graphics.clear();
        var g = segment.graphics;

        g.lineStyle(2, 0x00FF00, 1);

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

        var leftCirclePos =
            this.physicsbinder.bodyToActorPosition(segment.physics.leftCircleBody.GetPosition());

        g.drawCircle(leftCirclePos.x, leftCirclePos.y,
                              segment.physics.leftCircleFixture.GetShape().get_m_radius() * 
                                   this.physicsbinder.physicsUnitSize);

        var rightCirclePos =
            this.physicsbinder.bodyToActorPosition(segment.physics.rightCircleBody.GetPosition());

        g.drawCircle(rightCirclePos.x, rightCirclePos.y,
                              segment.physics.rightCircleFixture.GetShape().get_m_radius() * 
                                   this.physicsbinder.physicsUnitSize);

        var segmentPos =
            this.physicsbinder.bodyToActorPosition(segment.physics.segmentBody.GetPosition());

        g.moveTo(segmentPos.x, segmentPos.y);
        g.lineTo(leftCirclePos.x, leftCirclePos.y);
        g.moveTo(segmentPos.x, segmentPos.y);
        g.lineTo(rightCirclePos.x, rightCirclePos.y);

        g.moveTo(segment.baseNode.x, segment.baseNode.y);
        g.lineTo(segment.topNode.x, segment.topNode.y);
    };

    PlantBody.prototype.insertGraphics = function (stage) {
        //stage.addChild(this.baseAngularSpeedText);
        //stage.addChild(this.motorTorqueText);
        this.recurseOnSegments(this.firstSegment, (function (segment) {
            stage.addChild(segment.graphics);
        }).bind(this));
    };

    PlantBody.prototype.getBaseAngle = function (segment) {
        if (!segment.prevSegment) return -Math.PI;

        var prev = segment.prevSegment;

        var segAngle = Math.atan2(segment.topNode.x - segment.baseNode.x,
                                  segment.topNode.y - segment.baseNode.y);
        var prevAngle = Math.atan2(prev.topNode.x - prev.baseNode.x,
                                   prev.topNode.y - prev.baseNode.y);
        segAngle = segAngle - Math.floor(segAngle/Math.PI/2)*Math.PI*2;
        prevAngle = prevAngle - Math.floor(prevAngle/Math.PI/2)*Math.PI*2;

        return (segAngle + prevAngle) / 2;
    };

    PlantBody.prototype.getSegmentAngle = function (segment) {
        return Math.atan2(segment.topNode.x - segment.baseNode.x,
                          segment.topNode.y - segment.baseNode.y);
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

        return segAngle - prevAngle;
    };

    PlantBody.prototype.getRelativeAngularSpeed = function (segment) {
        var segSpeed = segment.physics.segmentBody.GetAngularVelocity();

        if (!segment.prevSegment) return segSpeed;

        return segSpeed - segment.prevSegment.physics.segmentBody.GetAngularVelocity();
    }

    PlantBody.prototype.moveSegmentToInitialPosition = function (segment) {
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

    PlantBody.prototype.applyCircleForces = function (segment) {
        var b = Box2D; var p = segment.physics;

        var physicsCircleDistance = segment.circleDistance / this.physicsbinder.physicsUnitSize;

        // Left

        var leftCirclePos = p.leftCircleBody.GetPosition();
        var segPos = p.segmentBody.GetPosition();
        var leftJointTranslation = new b.b2Vec2(leftCirclePos.get_x() - segPos.get_x(),
                                                leftCirclePos.get_y() - segPos.get_y());
        var leftJointDistance = leftJointTranslation.Length();
        var leftCircleVel = p.leftCircleBody.GetLinearVelocity();
        var segVel = p.segmentBody.GetLinearVelocity();
        var leftJointVel = new b.b2Vec2(leftCircleVel.get_x() - segVel.get_x(),
                                        leftCircleVel.get_y() - segVel.get_y());
        var leftJointSpeed = leftJointVel.Length();

        var motorForce = (physicsCircleDistance - leftJointDistance) * this.plantWallStiffness
                         - leftJointSpeed * this.plantWallDamping;
        var motorForce = 
            new b.b2Vec2(motorForce * leftJointTranslation.get_x()/leftJointDistance,
                         motorForce * leftJointTranslation.get_y()/leftJointDistance);

        p.leftCircleBody.ApplyForceToCenter(motorForce);
        p.segmentBody.ApplyForceToCenter(new b.b2Vec2(-motorForce.get_x(), -motorForce.get_y()));

        // Right

        var physicsCircleDistance = segment.circleDistance / this.physicsbinder.physicsUnitSize;

        var rightCirclePos = p.rightCircleBody.GetPosition();
        var segPos = p.segmentBody.GetPosition();
        var rightJointTranslation = new b.b2Vec2(rightCirclePos.get_x() - segPos.get_x(),
                                                rightCirclePos.get_y() - segPos.get_y());
        var rightJointDistance = rightJointTranslation.Length();
        var rightCircleVel = p.rightCircleBody.GetLinearVelocity();
        var segVel = p.segmentBody.GetLinearVelocity();
        var rightJointVel = new b.b2Vec2(rightCircleVel.get_x() - segVel.get_x(),
                                        rightCircleVel.get_y() - segVel.get_y());
        var rightJointSpeed = rightJointVel.Length();

        var motorForce = (physicsCircleDistance - rightJointDistance) * this.plantWallStiffness
                         - rightJointSpeed * this.plantWallDamping;
        var motorForce = 
            new b.b2Vec2(motorForce * rightJointTranslation.get_x()/rightJointDistance,
                         motorForce * rightJointTranslation.get_y()/rightJointDistance);

        p.rightCircleBody.ApplyForceToCenter(motorForce);
        p.segmentBody.ApplyForceToCenter(new b.b2Vec2(-motorForce.get_x(), -motorForce.get_y()));
    };
    
    PlantBody.prototype.moveCirclesToInitialPosition = function (segment) {
        var b = Box2D; var p = segment.physics;

        var circleRadius = this.getCircleRadius(segment.seglength);
        var circleDistance = this.getCircleDistance(segment.baseWidth,
                                                    segment.topWidth,
                                                    circleRadius);
        circleDistance /= this.physicsbinder.physicsUnitSize;
        circleDistance *= 5;
        var segmentPos = p.segmentBody.GetPosition();
        var segAngle = this.getSegmentAngle(segment);
        
        p.leftCircleBody.SetTransform
            ( new b.b2Vec2(segmentPos.get_x() - circleDistance * Math.cos(segAngle),
                           segmentPos.get_y() + circleDistance * Math.sin(segAngle)),
              segAngle );

        p.rightCircleBody.SetTransform
            ( new b.b2Vec2(segmentPos.get_x() + circleDistance * Math.cos(segAngle),
                           segmentPos.get_y() - circleDistance * Math.sin(segAngle)),
              segAngle );
    };

    PlantBody.prototype.moveCirclesToPosition = function (segment, newcentre, newangle) {
        var b = Box2D; var p = segment.physics;

        var leftCirclePos = p.leftCircleBody.GetPosition();
        var leftCircleVector = new b.b2Vec2(leftCirclePos.get_x() - newcentre.get_x(),
                                            leftCirclePos.get_y() - newcentre.get_y());
        var leftCircleDistance = leftCircleVector.Length();

        var rightCirclePos = p.rightCircleBody.GetPosition();
        var rightCircleVector = new b.b2Vec2(rightCirclePos.get_x() - newcentre.get_x(),
                                            rightCirclePos.get_y() - newcentre.get_y());
        console.log(rightCircleVector.get_x());
        console.log(rightCircleVector.get_y());
        var rightCircleDistance = rightCircleVector.Length();

        p.leftCircleBody.SetTransform
            ( new b.b2Vec2(newcentre.get_x() - leftCircleDistance * Math.cos(newangle),
                           newcentre.get_y() + leftCircleDistance * Math.sin(newangle)),
              newangle );

        p.rightCircleBody.SetTransform
            ( new b.b2Vec2(newcentre.get_x() + rightCircleDistance * Math.cos(newangle),
                           newcentre.get_y() - rightCircleDistance * Math.sin(newangle)),
              newangle );
    };

    PlantBody.prototype.attachCircles = function (segment) {
        var b = Box2D; var p = segment.physics;

        // Create bodies and fixtures

        var leftCircleBodyDef = new b.b2BodyDef();
        leftCircleBodyDef.set_type(b.b2_dynamicBody);

        var rightCircleBodyDef = new b.b2BodyDef();
        rightCircleBodyDef.set_type(b.b2_dynamicBody);

        p.leftCircleBody = this.physicsworld.CreateBody(leftCircleBodyDef);
        p.rightCircleBody = this.physicsworld.CreateBody(rightCircleBodyDef);
        
        var circleShape = new b.b2CircleShape();
        var circleRadius = this.getCircleRadius(segment.seglength);
        circleShape.set_m_radius(circleRadius / this.physicsbinder.physicsUnitSize);

        p.leftCircleFixture = p.leftCircleBody.CreateFixture(circleShape, this.circleDensity);
        p.rightCircleFixture = p.rightCircleBody.CreateFixture(circleShape, this.circleDensity);

        var segmentFilter = new b.b2Filter();
        segmentFilter.set_categoryBits(0x0002);
        segmentFilter.set_maskBits(0xFFFD);

        p.leftCircleFixture.SetFilterData(segmentFilter);
        p.rightCircleFixture.SetFilterData(segmentFilter);

        // Arrange and attach to segment body

        var circleDistance = this.getCircleDistance(segment.baseWidth,
                                                    segment.topWidth,
                                                    circleRadius);

        var physicsCircleDistance = circleDistance / this.physicsbinder.physicsUnitSize;
        console.log(physicsCircleDistance);
        p.leftCircleBody.SetTransform(new b.b2Vec2(-physicsCircleDistance, 0), 0);
        p.rightCircleBody.SetTransform(new b.b2Vec2(physicsCircleDistance, 0), 0);

        var leftCircleJointDef = new b.b2PrismaticJointDef();
        var rightCircleJointDef = new b.b2PrismaticJointDef();

        var anchor = new b.b2Vec2(0,0);
        leftCircleJointDef.Initialize(p.leftCircleBody, p.segmentBody, anchor, new b.b2Vec2(1,0));
        rightCircleJointDef.Initialize(p.rightCircleBody, p.segmentBody, anchor, new b.b2Vec2(-1,0));

        leftCircleJointDef.set_enableLimit(true);
        rightCircleJointDef.set_enableLimit(true);

        leftCircleJointDef.set_upperTranslation(0.1);
        rightCircleJointDef.set_upperTranslation(0.1);
        leftCircleJointDef.set_lowerTranslation(0.02);
        rightCircleJointDef.set_lowerTranslation(0.02);

        p.leftCircleJoint = this.physicsworld.CreateJoint(leftCircleJointDef);
        p.rightCircleJoint = this.physicsworld.CreateJoint(rightCircleJointDef);
    };

    PlantBody.prototype.computeStiffness = function (baseWidth, topWidth) {
        return this.widthToStiffness * (baseWidth + topWidth) / 2;
    };

    PlantBody.prototype.getCircleDistance = function (baseWidth, topWidth, radius) {
        return Math.max((baseWidth + topWidth) / 2 - (0.8 * radius), 0);
    };

    PlantBody.prototype.getCircleRadius = function (seglength) {
        return seglength * 0.8 / 2;
    };

    return PlantBody;
});
