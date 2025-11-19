'use client'
import React, {Component} from 'react';
import LogoWineFill from "../../../components/loading";

class Page extends Component {
    render() {
        return (
            <div>
                <header className="section-header"> test</header>

                <LogoWineFill
                    width={300}
                    duration={10}
                    color="#ff0000"      // ← fill color
                    baseColor="#555555"  // ← starting gray
                    outlineColor="#ffffff"
                />

            </div>
        );
    }
}

export default Page;