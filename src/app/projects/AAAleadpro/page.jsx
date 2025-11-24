'use client'
import React, { Component } from 'react';
import AnimatedLogo from "../../../components/AnimatedLogo";

class Page extends Component {
    render() {
        return (
            <div>
                <header className="section-header"> Animation</header>

                <AnimatedLogo
                    colors={["#fff", "#0099ff", "#ff0055"]}
                    speed={5}
                    width="400px"
                    height="400px"
                />

            </div>
        );
    }
}

export default Page;

