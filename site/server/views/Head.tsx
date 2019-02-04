import {BAKED_BASE_URL} from 'settings'
import * as React from 'react'
import { webpack } from 'utils/server/staticGen'

export const Head = (props: { canonicalUrl: string, pageTitle?: string, pageDesc?: string, imageUrl?: string, children?: any }) => {
    const {canonicalUrl} = props
    const pageTitle = props.pageTitle || `Our World in Data`
    const fullPageTitle = props.pageTitle ? `${props.pageTitle} - Our World in Data` : `Our World in Data`
    const pageDesc = props.pageDesc || "Living conditions around the world are changing rapidly. Explore how and why."
    const imageUrl = props.imageUrl || `${BAKED_BASE_URL}/wp-content/uploads/2016/06/OurWorldInData.png`

    return <head>
        <meta name="viewport" content="width=device-width, initial-scale=1"/>
        <title>{fullPageTitle}</title>
        <meta name="description" content={pageDesc}/>
        <link rel="canonical" href={canonicalUrl}/>
        <link rel="alternate" type="application/atom+xml" href="/atom.xml"/>
        <meta property="fb:app_id" content="1149943818390250"/>
        <meta property="og:url" content={canonicalUrl}/>
        <meta property="og:title" content={pageTitle}/>
        <meta property="og:description" content={pageDesc}/>
        <meta property="og:image" content={imageUrl}/>
        <meta property="og:site_name" content="Our World in Data"/>
        <meta name="twitter:card" content="summary_large_image"/>
        <meta name="twitter:site" content="@OurWorldInData"/>
        <meta name="twitter:creator" content="@OurWorldInData"/>
        <meta name="twitter:title" content={pageTitle}/>
        <meta name="twitter:description" content={pageDesc}/>
        <meta name="twitter:image" content={imageUrl}/>
        <link href="https://fonts.googleapis.com/css?family=Lato:300,400,400i,700,700i|Playfair+Display" rel="stylesheet" />
        <link rel="stylesheet" href={webpack('commons.css', 'site')}/>
        <link rel="stylesheet" href={webpack('owid.css', 'site')}/>
        {/*
            To best leverage Stripe’s advanced fraud functionality, include
            this script on every page of your site, not just the checkout page.
        */}
        <script src="https://js.stripe.com/v3/" />
        {props.children}
    </head>
}
