"""create political intelligence tables

Revision ID: 0002_political_intel
Revises: 0001_create_users
Create Date: 2026-02-26

"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "0002_political_intel"
down_revision = "0001_create_users"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "scheduler_jobs",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("interval_minutes", sa.Integer(), nullable=False, server_default="30"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("next_run_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("last_run_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.UniqueConstraint("name", name="uq_scheduler_jobs_name"),
    )

    op.create_table(
        "scrape_runs",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("job_id", sa.Integer(), sa.ForeignKey("scheduler_jobs.id"), nullable=False),
        sa.Column("status", sa.String(length=40), nullable=False, server_default="running"),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("finished_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("events_discovered", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("clusters_generated", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("suggestions_generated", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("error_message", sa.Text(), nullable=True),
    )
    op.create_index("ix_scrape_runs_job_id", "scrape_runs", ["job_id"])
    op.create_index("ix_scrape_runs_started_at", "scrape_runs", ["started_at"])

    op.create_table(
        "political_events",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("source", sa.String(length=120), nullable=False),
        sa.Column("source_url", sa.Text(), nullable=False),
        sa.Column("headline", sa.String(length=400), nullable=False),
        sa.Column("summary", sa.Text(), nullable=True),
        sa.Column("detected_topic", sa.String(length=120), nullable=True),
        sa.Column("published_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "metadata_json",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default=sa.text("'{}'::jsonb"),
        ),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.UniqueConstraint("source", "source_url", name="uq_political_events_source_url"),
    )
    op.create_index("ix_political_events_detected_topic", "political_events", ["detected_topic"])
    op.create_index("ix_political_events_published_at", "political_events", ["published_at"])

    op.create_table(
        "event_clusters",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("topic", sa.String(length=120), nullable=False),
        sa.Column("label", sa.String(length=240), nullable=False),
        sa.Column("confidence", sa.Float(), nullable=False, server_default="0.5"),
        sa.Column("latest_event_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_event_clusters_topic", "event_clusters", ["topic"])

    op.create_table(
        "market_suggestions",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("cluster_id", sa.Integer(), sa.ForeignKey("event_clusters.id"), nullable=False),
        sa.Column("status", sa.String(length=30), nullable=False, server_default="proposed"),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("market_question", sa.Text(), nullable=False),
        sa.Column("resolution_criteria", sa.Text(), nullable=False),
        sa.Column("confidence", sa.Float(), nullable=False, server_default="0.5"),
        sa.Column(
            "metadata_json",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default=sa.text("'{}'::jsonb"),
        ),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_market_suggestions_cluster_id", "market_suggestions", ["cluster_id"])


def downgrade() -> None:
    op.drop_index("ix_market_suggestions_cluster_id", table_name="market_suggestions")
    op.drop_table("market_suggestions")

    op.drop_index("ix_event_clusters_topic", table_name="event_clusters")
    op.drop_table("event_clusters")

    op.drop_index("ix_political_events_published_at", table_name="political_events")
    op.drop_index("ix_political_events_detected_topic", table_name="political_events")
    op.drop_table("political_events")

    op.drop_index("ix_scrape_runs_started_at", table_name="scrape_runs")
    op.drop_index("ix_scrape_runs_job_id", table_name="scrape_runs")
    op.drop_table("scrape_runs")

    op.drop_table("scheduler_jobs")
