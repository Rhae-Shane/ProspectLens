import asyncio
import json

import httpx

TOKEN = "6NJTB19mbxTg4Uhs33LXNPM7Ib4QWmtPg-GBXJdCOKU"
URL = "https://api.producthunt.com/v2/api/graphql"
HEADERS = {
    "Authorization": f"Bearer {TOKEN}",
    "Content-Type": "application/json",
    "Accept": "application/json",
}


async def gql(query: str, variables: dict | None = None) -> tuple[int, dict]:
    async with httpx.AsyncClient(timeout=30) as client:
        response = await client.post(URL, headers=HEADERS, json={"query": query, "variables": variables or {}})
        return response.status_code, response.json()


async def main() -> None:
    status, data = await gql(
        """
        query {
          posts(first: 3, order: VOTES) {
            edges {
              node {
                name
                tagline
                votesCount
                createdAt
                website
                url
              }
            }
          }
        }
        """
    )
    print("TOP POSTS:", status, json.dumps(data, indent=2)[:500])

    status, data = await gql(
        """
        query {
          post(slug: "notion") {
            name
            tagline
            votesCount
            commentsCount
            createdAt
            featuredAt
            website
            url
            topics { edges { node { name } } }
          }
        }
        """
    )
    print("NOTION POST:", status)
    print(json.dumps(data, indent=2)[:1200])

    # Try product lookup
    for slug in ["notion", "linear", "vercel"]:
        status, data = await gql(
            """
            query($slug: String!) {
              post(slug: $slug) {
                name
                votesCount
                createdAt
                url
              }
            }
            """,
            {"slug": slug},
        )
        post = (data.get("data") or {}).get("post")
        print(f"slug={slug}:", post)

    # product with launches
    status, data = await gql(
        """
        query {
          product(slug: "stripe") {
            name
            tagline
            website
            postsCount
            posts(first: 5) {
              edges {
                node {
                  name
                  tagline
                  votesCount
                  commentsCount
                  createdAt
                  featuredAt
                  url
                }
              }
            }
          }
        }
        """
    )
    print("PRODUCT STRIPE:", json.dumps(data, indent=2)[:1500])

    status, data = await gql(
        """
        query {
          post(slug: "stripe") {
            name
            tagline
            votesCount
            createdAt
            website
            url
          }
        }
        """
    )
    print("STRIPE POST:", status)
    print(json.dumps(data, indent=2)[:800])


if __name__ == "__main__":
    asyncio.run(main())
