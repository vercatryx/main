'use client'
import React, { Component } from 'react';
import LogoWineFill from "../../../components/loading";

class Page extends Component {
    render() {
        return (
            <div>
                <header className="section-header"> test</header>

                <LogoWineFill
                    width={300}
                    duration={10}
                />

            </div>
        );
    }
}

export default Page;