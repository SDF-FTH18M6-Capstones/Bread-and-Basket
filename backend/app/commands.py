import click
from flask.cli import with_appcontext
from .services.campaign_service import CampaignService
from .models.enums import CampaignStatus


@click.command("close-campaigns")
@with_appcontext
def return_overdue_command():
    """Close every overdue campaign"""
    results = CampaignService().close_due_campaigns()
    if len(results) <= 0:
        click.echo("Nothing to close.")
    for result in results:
        if result["outcome"] == CampaignStatus.SUCCESSFUL.value:
            click.echo(
                f"{result['campaign'].title}: {result['outcome']} ({result['orders_confirmed'] } orders confirmed) "
            )
        else:
            click.echo(
                f"{result['campaign'].title}: {result['outcome']} ({result['orders_refunded']} orders refunded) "
            )


def register_commands(app):
    app.cli.add_command(return_overdue_command)
